import { parseSync } from '@swc/wasm';
import { visit } from 'unist-util-visit';

import logger from '#logger/index.mjs';
import { walk } from '#utils/swc.mjs';

import { lookupTypeName, resolveTypeReference } from './transformers.mjs';

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
 * Resolves a type value as a `|`-separated union of display names (e.g.
 * `HTTP/2 Headers Object | HTTP/2 Raw Headers`). Map keys may contain spaces
 * and slashes, so such values may not parse as TypeScript, but each part is
 * still resolvable on its own.
 *
 * @param {string} value The type value
 * @param {Record<string, string>} typeMap The toolchain mapping of types to links
 * @returns {Array<{ start: number, end: number, text: string, href: string }>} The resolved links
 */
const resolveDisplayNames = (value, typeMap) => {
  const links = [];

  for (const { 0: part, index } of value.matchAll(/(?:[^|]|\|\|)+/g)) {
    // An array of a type links to the type itself
    const name = part.trim().replace(/(\[\])+$/, '');
    const href = name && resolveTypeReference(name, typeMap);

    if (href) {
      const start = index + part.indexOf(name);

      links.push({ start, end: start + name.length, text: name, href });
    }
  }

  return links;
};

/**
 * Resolves a type value's links: the whole value when it is a map key in its
 * own right, then its parsed identifiers, then its display names
 *
 * @param {string} value The type value
 * @param {Record<string, string>} typeMap The toolchain mapping of types to links
 * @param {{ error?: boolean, identifiers?: Array<object> }} result The parse of `value`
 * @returns {Array<{ start: number, end: number, text: string, href: string }>} The resolved links
 */
const resolveLinks = (value, typeMap, result) => {
  const url = lookupTypeName(value, typeMap);

  if (url) {
    return [{ start: 0, end: value.length, text: value, href: url }];
  }

  if (result.error) {
    return resolveDisplayNames(value, typeMap);
  }

  return (
    result.identifiers
      .map(({ start, end, text, lookup }) => ({
        start,
        end,
        text,
        href: resolveTypeReference(lookup, typeMap),
      }))
      .filter(({ href }) => href)
      // The hast handlers slice the value by these ranges in order
      .sort((a, b) => a.start - b.start)
  );
};

/**
 * Resolves every `typeAnnotation` node in a file's tree
 */
export const resolveTypeAnnotations = (tree, typeMap, path) => {
  const nodes = [];

  // A visitor must not return a value: `visit` reads a number as the index to
  // continue from, which would skip siblings
  visit(tree, 'typeAnnotation', node => {
    nodes.push(node);
  });

  parseTypeValues(nodes.map(({ value }) => value)).forEach((result, index) => {
    const node = nodes[index];
    const links = resolveLinks(node.value, typeMap, result);

    // Unparseable display names must not be highlighted as the TypeScript
    // they are not (which colours the `/` and `2` of `HTTP/2`)
    node.data = { links, typescript: !result.error };

    if (result.error && !links.length) {
      node.data.parseError = true;

      logger.warn(`Invalid type annotation: {${node.value}}`, {
        file: { path, position: node.position },
      });
    }
  });
};
