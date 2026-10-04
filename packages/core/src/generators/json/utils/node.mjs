'use strict';

import { toString } from 'mdast-util-to-string';

import { transformNodeToHeading } from '#generators/metadata/utils/transformers.mjs';

import {
  CALLABLE_KINDS,
  EXTENDS_CLAUSE,
  KINDS,
  SECTION_KIND,
} from '../constants.mjs';
import { buildEntry, entryBody, takeTypedItems } from './entry.mjs';
import {
  buildEventParameters,
  buildExtends,
  buildPropertyType,
  buildSignature,
} from './signature.mjs';

/**
 * Classifies an entry: the kind its heading documents and, when a `global`
 * override replaced that classification, the scope it sets instead.
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @returns {{ kind: string, scope?: 'global' }}
 */
export const classify = entry => {
  const { type } = entry.heading.data;

  if (type === 'global') {
    const { type: structural } = transformNodeToHeading(entry.heading);

    return { kind: KINDS[structural] ?? SECTION_KIND, scope: 'global' };
  }

  return { kind: KINDS[type] ?? SECTION_KIND };
};

/**
 * The bare identifier an entry documents
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @param {string} kind The entry's kind
 * @returns {string}
 */
export const nodeName = (entry, kind) => {
  if (typeof entry.name === 'string') {
    return entry.name;
  }

  const { name } = entry.heading.data;

  switch (kind) {
    case SECTION_KIND:
      return toString(entry.heading.children).trim();
    case 'class':
    case 'constructor':
      // `http.Server`, `buffer.Blob`, `Foo extends Bar`
      return name.split(EXTENDS_CLAUSE)[0].split('.').at(-1);
    default:
      return name;
  }
};

/**
 * The properties a node has on top of its entry, by kind.
 *
 * @param {string} kind
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @param {Array<import('mdast').ListItem>} items The entry's typed list items
 * @returns {{ properties: object, description?: string }}
 */
const kindProperties = (kind, entry, items) => {
  if (CALLABLE_KINDS.has(kind)) {
    return {
      properties: {
        signature: buildSignature(entry.heading, items, entry.mdx),
      },
    };
  }

  switch (kind) {
    case 'class':
      return { properties: { extends: buildExtends(entry.heading, items) } };
    case 'property': {
      const {
        type,
        default: value,
        description,
      } = buildPropertyType(items, entry.mdx);

      return { properties: { type, default: value }, description };
    }
    case 'event':
      return {
        properties: { parameters: buildEventParameters(items, entry.mdx) },
      };
    default:
      return { properties: {} };
  }
};

/**
 * Builds a node and its subtree from a hierarchized entry.
 *
 * @param {import('#utils/hierarchy.mjs').HierarchizedEntry} node
 * @param {'module' | 'global'} scope The document's scope
 * @returns {import('../types').Node}
 */
export const buildNode = ({ entry, children }, scope) => {
  const { kind, scope: entryScope = scope } = classify(entry);
  const { body, items } = takeTypedItems(entryBody(entry), kind);
  const { properties, description: typeDescription } = kindProperties(
    kind,
    entry,
    items
  );

  const {
    title,
    stability,
    added,
    deprecated,
    removed,
    napiVersion,
    changes,
    description,
    summary,
    examples,
  } = buildEntry(entry, body);

  return {
    kind,
    id: entry.heading.data.slug,
    name: nodeName(entry, kind),
    title,
    scope: entryScope,
    overloadOf: entry.heading.data.overloadOf ?? null,
    stability,
    added,
    deprecated,
    removed,
    napiVersion,
    changes,
    ...properties,
    // A property's type item may describe it; that comes first
    description: [typeDescription, description].filter(Boolean).join('\n\n'),
    summary,
    examples,
    children: children.map(child => buildNode(child, scope)),
  };
};
