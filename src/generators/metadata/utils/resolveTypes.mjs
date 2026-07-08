'use strict';

import { visit } from 'unist-util-visit';

import { lookupTypeName, resolveTypeReference } from './transformers.mjs';
import logger from '../../../logger/index.mjs';

/**
 * @typedef {Object} TypeLink A resolved link inside a type annotation
 * @property {number} start Start offset within the annotation value
 * @property {number} end End offset (exclusive) within the annotation value
 * @property {string} text The linked text
 * @property {string} href The resolved documentation URL
 *
 * @typedef {Object} TypeIdentifier A link candidate found by the TS parser
 * @property {number} start Start offset within the parsed value
 * @property {number} end End offset (exclusive) within the parsed value
 * @property {string} text The identifier text as written
 * @property {string} lookup The name to resolve (differs for `import()` types)
 */

/**
 * Creates the type resolver. TypeScript is imported here — it's a heavy
 * module, and every worker thread preloads every generator, so only callers
 * that actually resolve types (the metadata chunks) pay for it. The runtime
 * module registry caches the import, so creating multiple resolvers is cheap.
 */
export const createTypeResolver = async () => {
  const { default: ts } = await import('typescript');

  // Keyword type nodes that resolve through the built-in map (`{string}`,
  // `{number}`, ...)
  const keywordKinds = new Set([
    ts.SyntaxKind.AnyKeyword,
    ts.SyntaxKind.BigIntKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.NeverKeyword,
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.ObjectKeyword,
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.SymbolKeyword,
    ts.SyntaxKind.UndefinedKeyword,
    ts.SyntaxKind.UnknownKeyword,
    ts.SyntaxKind.VoidKeyword,
  ]);

  /**
   * Walks a parsed type and collects every node that should become a link:
   * keyword types, type-reference names (including qualified names like
   * `vm.Module`), `typeof X` targets, `import('mod').X` qualifiers, `this`,
   * and the `null` literal type. Structural names (parameters, properties)
   * produce no candidates.
   *
   * @param {import('typescript').SourceFile} sourceFile
   * @param {import('typescript').TypeNode} root
   * @param {number} base Offset of the value within the synthetic source
   * @returns {Array<TypeIdentifier>}
   */
  const collectIdentifiers = (sourceFile, root, base) => {
    const identifiers = [];

    /**
     * @param {import('typescript').Node} node The node to record
     * @param {string} [lookup] Override for the name to resolve
     */
    const add = (node, lookup) => {
      const start = node.getStart(sourceFile);
      const text = sourceFile.text.slice(start, node.end);

      identifiers.push({
        start: start - base,
        end: node.end - base,
        text,
        lookup: lookup ?? text,
      });
    };

    /**
     * @param {import('typescript').Node} node
     */
    const visitType = node => {
      if (ts.isTypeReferenceNode(node)) {
        add(node.typeName);
        node.typeArguments?.forEach(visitType);
      } else if (ts.isTypeQueryNode(node)) {
        add(node.exprName);
        node.typeArguments?.forEach(visitType);
      } else if (ts.isImportTypeNode(node)) {
        // `import('fs').Stats` resolves like the dotted name `fs.Stats`,
        // but only the qualifier is linked
        const moduleName = ts.isLiteralTypeNode(node.argument)
          ? node.argument.literal.text
          : undefined;

        if (node.qualifier) {
          const qualifierText = sourceFile.text.slice(
            node.qualifier.getStart(sourceFile),
            node.qualifier.end
          );

          add(
            node.qualifier,
            moduleName ? `${moduleName}.${qualifierText}` : undefined
          );
        }

        node.typeArguments?.forEach(visitType);
      } else if (
        keywordKinds.has(node.kind) ||
        node.kind === ts.SyntaxKind.ThisType ||
        (ts.isLiteralTypeNode(node) &&
          node.literal.kind === ts.SyntaxKind.NullKeyword)
      ) {
        add(node);
      } else {
        ts.forEachChild(node, visitType);
      }
    };

    visitType(root);

    return identifiers;
  };

  /**
   * Parses a wrapped `type $T<i> = <value>;` alias statement list and
   * validates it round-trips to exactly one alias per value.
   *
   * @param {Array<string>} values
   * @returns {{ sourceFile: import('typescript').SourceFile, bases: Array<number> } | undefined}
   */
  const parseAliases = values => {
    let source = '';
    const bases = [];

    values.forEach((value, index) => {
      source += `type $T${index} = `;
      bases.push(source.length);
      source += `${value};\n`;
    });

    const sourceFile = ts.createSourceFile(
      'types.d.ts',
      source,
      ts.ScriptTarget.Latest,
      false
    );

    const valid =
      (sourceFile.parseDiagnostics ?? []).length === 0 &&
      sourceFile.statements.length === values.length &&
      sourceFile.statements.every(ts.isTypeAliasDeclaration);

    return valid ? { sourceFile, bases } : undefined;
  };

  /**
   * Parses type values with the TypeScript compiler — all of them in ONE
   * synthetic source file. Only when that batch fails to parse cleanly is
   * each value re-parsed individually to isolate the invalid ones.
   *
   * @param {Array<string>} values
   * @returns {Array<{ identifiers: Array<TypeIdentifier> } | { error: true }>}
   */
  const parseTypeValues = values => {
    const batch = parseAliases(values);

    if (batch) {
      return batch.sourceFile.statements.map((statement, index) => ({
        identifiers: collectIdentifiers(
          batch.sourceFile,
          statement.type,
          batch.bases[index]
        ),
      }));
    }

    return values.map(value => {
      const single = parseAliases([value]);

      if (!single) {
        return { error: true };
      }

      return {
        identifiers: collectIdentifiers(
          single.sourceFile,
          single.sourceFile.statements[0].type,
          single.bases[0]
        ),
      };
    });
  };

  /**
   * Resolves every `typeAnnotation` node in a file's tree, attaching
   * `node.data.links` (and `node.data.parseError` when the annotation isn't
   * valid TypeScript).
   *
   * An annotation whose whole value matches a type-map entry verbatim (which
   * permits display-name keys like `zlib options`) becomes a single link.
   * The rest are batch-parsed as TypeScript — one parse for the entire file —
   * and each identifier inside them resolves through the same map tiers plus
   * the dotted-name heuristic.
   *
   * @param {import('unist').Node} tree The file's mdast tree
   * @param {Record<string, string>} typeMap The mapping of types to links
   * @param {string} path The file path, for diagnostics
   */
  const resolveTypeAnnotations = (tree, typeMap, path) => {
    /** @type {Array<{ type: string, value: string, data?: Object }>} */
    const pending = [];

    visit(tree, 'typeAnnotation', node => {
      node.data = { links: [] };

      const url = lookupTypeName(node.value, typeMap);

      if (url) {
        node.data.links.push({
          start: 0,
          end: node.value.length,
          text: node.value,
          href: url,
        });
      } else {
        pending.push(node);
      }
    });

    parseTypeValues(pending.map(({ value }) => value)).forEach(
      (result, index) => {
        const node = pending[index];

        if (result.error) {
          node.data.parseError = true;

          logger.warn(`Invalid type annotation: {${node.value}}`, {
            file: { path, position: node.position },
          });

          return;
        }

        for (const { start, end, text, lookup } of result.identifiers) {
          const href = resolveTypeReference(lookup, typeMap);

          if (href) {
            node.data.links.push({ start, end, text, href });
          }
        }

        // The hast handlers slice the value by these ranges in order
        node.data.links.sort((a, b) => a.start - b.start);
      }
    );
  };

  return { parseTypeValues, resolveTypeAnnotations };
};
