import { parseSync } from '@swc/wasm';
import { visit } from 'unist-util-visit';

import { lookupTypeName, resolveTypeReference } from './transformers.mjs';
import logger from '../../../logger/index.mjs';
import { walk } from '../../../utils/swc.mjs';

// `null` is a keyword kind in SWC, unlike most parsers which treat it as a literal type
const KEYWORDS = new Set([
  'string',
  'number',
  'boolean',
  'any',
  'unknown',
  'never',
  'void',
  'undefined',
  'object',
  'bigint',
  'symbol',
  'null',
]);

/**
 * Parses a wrapped `type $Ti = <value>;` statement
 */
const parseAliases = values => {
  const prefixes = [];
  let offset = 0;

  const source = values
    .map((value, i) => {
      const decl = `type $T${i} = `;
      prefixes.push(offset + decl.length);
      const line = `${decl}${value};\n`;
      offset += line.length;
      return line;
    })
    .join('');

  let program;

  try {
    program = parseSync(source, { syntax: 'typescript' });
  } catch {
    return undefined;
  }

  // SWC spans are absolute and keep growing across parse calls; the module's
  // span begins at the first token, which is the start of our source
  const spanOffset = program.span.start;

  const identifiersPerAlias = values.map(() => []);

  /**
   *
   */
  const record = node => {
    const start = node.span.start - spanOffset;
    const end = node.span.end - spanOffset;

    const index = Math.max(
      0,
      prefixes.findLastIndex(prefix => prefix <= start)
    );

    const base = prefixes[index];
    const text = source.slice(start, end);

    identifiersPerAlias[index].push({
      start: start - base,
      end: end - base,
      text,
      lookup: text,
    });
  };

  walk(program, {
    /**
     *
     */
    TsTypeReference: node => record(node.typeName), // Promise<T>, vm.Module
    /**
     *
     */
    TsTypeQuery: node => record(node.exprName), // typeof Foo
    /**
     *
     */
    TsImportType: node => node.qualifier && record(node.qualifier), // import('fs').Stats
    /**
     *
     */
    TsKeywordType: node => KEYWORDS.has(node.kind) && record(node), // string, null, ...
    TsThisType: record,
  });

  return identifiersPerAlias.map(identifiers => ({ identifiers }));
};

/**
 * Parses type values
 */
export const parseTypeValues = values => {
  const batch = parseAliases(values);

  if (batch) {
    return batch;
  }

  return values.map(value => parseAliases([value])?.[0] ?? { error: true });
};

/**
 * Resolves every `typeAnnotation` node in a file's tree
 */
export const resolveTypeAnnotations = (tree, typeMap, path) => {
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
