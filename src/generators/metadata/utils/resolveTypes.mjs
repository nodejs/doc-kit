import { parse } from '@yuku-parser/wasm';
import { visit } from 'unist-util-visit';
import { walk } from 'yuku-ast';

import { lookupTypeName, resolveTypeReference } from './transformers.mjs';
import logger from '../../../logger/index.mjs';

const KEYWORDS = [
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
  'TSAnyKeyword',
  'TSUnknownKeyword',
  'TSNeverKeyword',
  'TSVoidKeyword',
  'TSNullKeyword',
  'TSUndefinedKeyword',
  'TSObjectKeyword',
  'TSBigIntKeyword',
  'TSSymbolKeyword',
  'TSThisType',
];

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

  const result = parse(source, { lang: 'ts' });

  if (result.diagnostics.length > 0) {
    return undefined;
  }

  const identifiersPerAlias = values.map(() => []);

  /**
   *
   */
  const record = node => {
    const [start, end] = node.range ?? [node.start, node.end];

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

  walk(result.program, {
    /**
     *
     */
    TSTypeReference: node => record(node.typeName), // Promise<T>, vm.Module
    /**
     *
     */
    TSTypeQuery: node => record(node.exprName), // typeof Foo
    /**
     *
     */
    TSImportType: node => node.qualifier && record(node.qualifier), // import('fs').Stats
    ...Object.fromEntries(KEYWORDS.map(kind => [kind, record])),
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
