'use strict';

import { resolve, dirname, basename } from 'node:path';

import { h as createElement } from 'hastscript';
import { slice } from 'mdast-util-slice-markdown';
import readingTime from 'reading-time';
import { u as createTree } from 'unist-builder';
import { SKIP, visit } from 'unist-util-visit';

import { createJSXElement } from './ast.mjs';
import { extractHeadings, extractTextContent } from './buildBarProps.mjs';
import { enforceArray } from '../../../utils/array.mjs';
import { omitKeys } from '../../../utils/misc.mjs';
import { JSX_IMPORTS } from '../../web/constants.mjs';
import {
  STABILITY_LEVELS,
  LIFECYCLE_LABELS,
  INTERNATIONALIZABLE,
  STABILITY_PREFIX_LENGTH,
  DEPRECATION_TYPE_PATTERNS,
  ALERT_LEVELS,
  TYPES_WITH_METHOD_SIGNATURES,
  TYPE_PREFIX_LENGTH,
} from '../constants.mjs';
import {
  insertSignatureCodeBlock,
  createSignatureTable,
  getFullName,
} from './signature.mjs';
import getConfig from '../../../utils/configuration/index.mjs';
import {
  GITHUB_BLOB_URL,
  populate,
} from '../../../utils/configuration/templates.mjs';
import { UNIST } from '../../../utils/queries/index.mjs';
import { getRemarkRecma as remark } from '../../../utils/remark.mjs';

/**
 * Processes lifecycle and change history data into a sorted array of change entries.
 * @param {import('../../metadata/types').MetadataEntry} entry - The metadata entry
 */
export const gatherChangeEntries = entry => {
  // Lifecycle changes (e.g., added, deprecated)
  const lifecycleChanges = Object.entries(LIFECYCLE_LABELS)
    .filter(([field]) => entry[field])
    .map(([field, label]) => ({
      versions: enforceArray(entry[field]),
      label: `${label}: ${enforceArray(entry[field]).join(', ')}`,
    }));

  // Explicit changes with parsed JSX labels
  const explicitChanges = (entry.changes || []).map(change => ({
    versions: enforceArray(change.version),
    label: remark().runSync(remark().parse(change.description)).body[0]
      .expression,
    url: change['pr-url'],
  }));

  return [...lifecycleChanges, ...explicitChanges];
};

/**
 * Creates a JSX ChangeHistory element or returns null if no changes.
 * @param {import('../../metadata/types').MetadataEntry} entry - The metadata entry
 */
export const createChangeElement = entry => {
  const changes = gatherChangeEntries(entry);

  if (!changes.length) {
    return null;
  }

  return createJSXElement(JSX_IMPORTS.ChangeHistory.name, {
    changes,
    className: 'change-history',
  });
};

/**
 * Creates a span element with a link to the source code, or null if no source.
 * @param {string|undefined} sourceLink - The source link path
 */
export const createSourceLink = sourceLink => {
  const config = getConfig('jsx-ast');

  return sourceLink
    ? createElement('span', [
        INTERNATIONALIZABLE.sourceCode,
        createElement(
          'a',
          {
            href: `${populate(GITHUB_BLOB_URL, config)}${sourceLink}`,
            target: '_blank',
          },
          [
            sourceLink,
            createJSXElement(JSX_IMPORTS.ArrowUpRightIcon.name, {
              inline: true,
              className: 'arrow',
            }),
          ]
        ),
      ])
    : null;
};

/**
 * Extracts heading content text with fallback and formats it.
 * @param {import('mdast').Node} content - The content node to extract text from
 */
export const extractHeadingContent = content => {
  const { text, type } = content.data;

  if (!text) {
    return content.children;
  }

  // Try to get full name; fallback slices text after first colon
  const fullName = getFullName(content.data, false);

  if (fullName) {
    return type === 'ctor' ? `${fullName} Constructor` : fullName;
  }

  return content.children;
};

/**
 * Creates a heading wrapper element with anchors, icons, and optional change history.
 * @param {import('../../metadata/types').HeadingNode} content - The content node to extract text from
 * @param {import('unist').Node|null} changeElement - The change history element, if available
 */
export const createHeadingElement = (content, changeElement) => {
  const { type, slug } = content.data;

  let headingContent = extractHeadingContent(content);

  // Build heading with anchor link
  const headingWrapper = createElement('div', [
    createElement(
      `h${content.depth}`,
      { id: slug },
      createElement(
        'a',
        { href: `#${slug}`, className: ['anchor'] },
        headingContent
      )
    ),
  ]);

  // Prepend type icon if not 'misc' and type exists
  if (type && type !== 'misc') {
    headingWrapper.children.unshift(
      createJSXElement(JSX_IMPORTS.DataTag.name, { kind: type, size: 'sm' })
    );
  }

  // Append change history if available
  if (changeElement) {
    headingWrapper.children.push(changeElement);
  }

  return headingWrapper;
};

/**
 * Converts a stability note node to an AlertBox JSX element
 * @param {import('../../metadata/types').StabilityNode} node - The stability node to transform
 * @param {number} index - The index of the node in its parent's children array
 * @param {import('unist').Parent} parent - The parent node containing the stability node
 */
export const transformStabilityNode = (node, index, parent) => {
  // Calculate slice start to skip the stability prefix + index length
  const start = STABILITY_PREFIX_LENGTH + node.data.index.length;
  const stabilityLevel = parseInt(node.data.index, 10);

  parent.children[index] = createJSXElement(JSX_IMPORTS.AlertBox.name, {
    children: slice(node, start, undefined, {
      textHandling: { boundaries: 'preserve' },
    }).node.children[0].children,
    level: STABILITY_LEVELS[stabilityLevel],
    title: `Stability: ${node.data.index}`,
  });

  return [SKIP];
};

/**
 * Maps deprecation type text to AlertBox level
 *
 * @param {string} typeText - The deprecation type text
 * @returns {string} The corresponding AlertBox level
 */
const getLevelFromDeprecationType = typeText => {
  const match = DEPRECATION_TYPE_PATTERNS.find(p => p.pattern.test(typeText));

  return match ? match.level : ALERT_LEVELS.DANGER;
};

/**
 * Transforms a heading node by injecting metadata, source links, and signatures.
 * @param {import('../../metadata/types').MetadataEntry} entry - The API metadata entry
 * @param {import('../../metadata/types').HeadingNode} node - The heading node to transform
 * @param {number} index - The index of the node in its parent's children array
 * @param {import('unist').Parent} parent - The parent node containing the heading
 */
export const transformHeadingNode = async (entry, node, index, parent) => {
  // Replace heading node with our enhanced heading element
  parent.children[index] = createHeadingElement(
    node,
    createChangeElement(entry)
  );

  if (entry.api === 'deprecations' && node.depth === 3) {
    // On the 'deprecations.md' page, "Type: <XYZ>" turns into an AlertBox
    // Extract the nodes representing the type text
    const { node } = slice(
      parent.children[index + 1],
      TYPE_PREFIX_LENGTH,
      undefined,
      { textHandling: { boundaries: 'preserve' } }
    );

    // Then retrieve its children to be the AlertBox content
    const { children: sliced } = node;

    parent.children[index + 1] = createJSXElement(JSX_IMPORTS.AlertBox.name, {
      children: sliced,
      // we assume sliced[0] is a text node here that contains the type text
      level: getLevelFromDeprecationType(sliced[0].value),
      title: 'Type',
    });
  }

  // Add source link element if available, right after heading
  const sourceLink = createSourceLink(entry.source_link);

  if (sourceLink) {
    parent.children.splice(index + 1, 0, sourceLink);
  }

  // If the heading type supports method signatures, insert signature block
  if (TYPES_WITH_METHOD_SIGNATURES.includes(node.data.type)) {
    insertSignatureCodeBlock(parent, node, index + 1);
  }

  return [SKIP];
};

/**
 * Processes a single API documentation entry's content
 * @param {import('../../metadata/types').MetadataEntry} entry - The API metadata entry to process
 */
export const processEntry = entry => {
  // Deep copy content to avoid mutations on original
  const content = structuredClone(entry.content);

  // Visit and transform stability nodes
  visit(content, UNIST.isStabilityNode, transformStabilityNode);

  // Visit and transform headings with metadata and links
  visit(content, UNIST.isHeading, (...args) =>
    transformHeadingNode(entry, ...args)
  );

  // Transform typed lists into property tables
  visit(
    content,
    UNIST.isStronglyTypedList,
    (node, idx, parent) => (parent.children[idx] = createSignatureTable(node))
  );

  return content;
};

/**
 * Builds the overall document layout tree
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - API documentation metadata entries
 * @param {Object} metadata - Raw page metadata from the head entry
 */
export const createDocumentLayout = (entries, metadata) =>
  createTree('root', [
    createJSXElement(JSX_IMPORTS.Layout.name, {
      metadata,
      headings: extractHeadings(entries),
      readingTime: readingTime(extractTextContent(entries)).text,
      children: entries.map(processEntry),
    }),
  ]);

/**
 * Checks if a given URL is a local asset path.
 *
 * @param {string} url - The URL or path to check.
 * @returns {boolean} True if the asset is local, false otherwise.
 */
function isLocalAsset(url) {
  if (!url || url.startsWith('//')) {
    return false;
  }

  try {
    new URL(url);
    return false;
  } catch {
    return true;
  }
}

/**
 * Traverses the AST of markdown files to find local image references,
 * rewrites their URLs to a relative assets folder, and collects their paths.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} metadataEntries - API documentation metadata entries
 * @returns {Map<string, string>} A Map containing source paths as keys and destination paths as values.
 */
function extractAssetsFromAST(metadataEntries) {
  const assetsMap = new Map();
  for (const entry of metadataEntries) {
    if (!entry.content) {
      continue;
    }
    visit(entry.content, 'image', imageNode => {
      const originalUrl = imageNode.url;

      if (isLocalAsset(originalUrl)) {
        const sourceDir = entry.fullPath
          ? dirname(entry.fullPath)
          : process.cwd();
        const sourcePath = resolve(sourceDir, originalUrl);
        const fileName = basename(originalUrl);

        assetsMap.set(sourcePath, fileName);

        // Rewrite AST URL
        imageNode.url = `/assets/${fileName}`;
      }
    });
  }

  return assetsMap;
}

/**
 * @typedef {import('estree').Node & { data: import('../../metadata/types').MetadataEntry }} JSXContent
 *
 * Transforms API metadata entries into processed MDX content
 * @param {Array<import('../../metadata/types').MetadataEntry>} metadataEntries - API documentation metadata entries
 * @param {import('../../metadata/types').MetadataEntry} head - Main API metadata entry with version information
 * @returns {Promise<JSXContent>}
 */
const buildContent = async (metadataEntries, head) => {
  // First extract assets and rewrite URLs in the AST
  const assetsMap = Object.fromEntries(extractAssetsFromAST(metadataEntries));

  // The metadata is the heading without the node children
  const metadata = omitKeys(head, [
    'content',
    'heading',
    'stability',
    'changes',
  ]);

  // Create root document AST with all layout components and processed content
  const root = createDocumentLayout(metadataEntries, metadata);

  // Run remark processor to transform AST (parse markdown, plugins, etc.)
  const ast = await remark().run(root);

  // The final MDX content is the expression in the Program's first body node
  return { ...ast.body[0].expression, data: head, assetsMap };
};

export default buildContent;
