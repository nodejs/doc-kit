import { h as createElement } from 'hastscript';
import { slice } from 'mdast-util-slice-markdown';
import { u as createTree } from 'unist-builder';
import { SKIP, visit } from 'unist-util-visit';

import { createJSXElement } from './ast.mjs';
import { buildMetaBarProps } from './buildBarProps.mjs';
import createPropertyTable from './buildPropertyTable.mjs';
import { DOC_NODE_BLOB_BASE_URL } from '../../../constants.mjs';
import { enforceArray } from '../../../utils/array.mjs';
import { sortChanges } from '../../../utils/generators.mjs';
import createQueries from '../../../utils/queries/index.mjs';
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
import insertSignature, { getFullName } from './buildSignature.mjs';

/**
 * Processes lifecycle and change history data into a sorted array of change entries.
 * @param {ApiDocMetadataEntry} entry - The metadata entry
 * @param {import('unified').Processor} remark - The remark processor
 */
export const gatherChangeEntries = (entry, remark) => {
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
    label: remark.runSync(remark.parse(change.description)).body[0].expression,
    url: change['pr-url'],
  }));

  return [...lifecycleChanges, ...explicitChanges];
};

/**
 * Creates a JSX ChangeHistory element or returns null if no changes.
 * @param {ApiDocMetadataEntry} entry - The metadata entry
 * @param {import('unified').Processor} remark - The remark processor
 */
export const createChangeElement = (entry, remark) => {
  const changeEntries = gatherChangeEntries(entry, remark);

  if (!changeEntries.length) {
    return null;
  }

  // Sort changes by versions and reverse for newest first
  const sortedChanges = sortChanges(changeEntries, 'versions');

  return createJSXElement(JSX_IMPORTS.ChangeHistory.name, {
    changes: sortedChanges,
    className: 'change-history',
  });
};

/**
 * Creates a span element with a link to the source code, or null if no source.
 * @param {string|undefined} sourceLink - The source link path
 */
export const createSourceLink = sourceLink =>
  sourceLink
    ? createElement('span', [
        INTERNATIONALIZABLE.sourceCode,
        createElement(
          'a',
          { href: `${DOC_NODE_BLOB_BASE_URL}${sourceLink}`, target: '_blank' },
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
 * @param {import('mdast').Node} content - The content node to extract text from
 * @param {import('unist').Node|null} changeElement - The change history element, if available
 */
export const createHeadingElement = (content, changeElement) => {
  const { type, depth, slug } = content.data;

  let headingContent = extractHeadingContent(content);

  // Build heading with anchor link
  const headingWrapper = createElement('div', [
    createElement(`h${depth}`, [
      createElement(`a#${slug}`, { href: `#${slug}` }, headingContent),
    ]),
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
 * @param {import('mdast').Blockquote} node - The stability node to transform
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
 * @param {ApiDocMetadataEntry} entry - The API metadata entry
 * @param {import('unified').Processor} remark - The remark processor
 * @param {import('mdast').Heading} node - The heading node to transform
 * @param {number} index - The index of the node in its parent's children array
 * @param {import('unist').Parent} parent - The parent node containing the heading
 */
export const transformHeadingNode = (entry, remark, node, index, parent) => {
  // Replace heading node with our enhanced heading element
  parent.children[index] = createHeadingElement(
    node,
    createChangeElement(entry, remark)
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
    insertSignature(parent, node, index + 1);
  }

  return [SKIP];
};

/**
 * Processes a single API documentation entry's content
 * @param {ApiDocMetadataEntry} entry - The API metadata entry to process
 * @param {import('unified').Processor} remark - The remark processor
 */
export const processEntry = (entry, remark) => {
  // Deep copy content to avoid mutations on original
  const content = structuredClone(entry.content);

  // Visit and transform stability nodes
  visit(content, createQueries.UNIST.isStabilityNode, transformStabilityNode);

  // Visit and transform headings with metadata and links
  visit(content, createQueries.UNIST.isHeading, (...args) =>
    transformHeadingNode(entry, remark, ...args)
  );

  // Transform typed lists into property tables
  visit(
    content,
    createQueries.UNIST.isStronglyTypedList,
    (node, idx, parent) => (parent.children[idx] = createPropertyTable(node))
  );

  return content;
};

/**
 * Builds the overall document layout tree
 * @param {Array<ApiDocMetadataEntry>} entries - API documentation metadata entries
 * @param {ReturnType<import('./buildBarProps.mjs').buildSideBarProps>} sideBarProps - Props for the sidebar component
 * @param {ReturnType<buildMetaBarProps>} metaBarProps - Props for the meta bar component
 * @param {import('unified').Processor} remark - The remark processor
 */
export const createDocumentLayout = (
  entries,
  sideBarProps,
  metaBarProps,
  remark
) =>
  createTree('root', [
    createJSXElement(JSX_IMPORTS.NavBar.name),
    createJSXElement(JSX_IMPORTS.Article.name, {
      children: [
        createJSXElement(JSX_IMPORTS.SideBar.name, sideBarProps),
        createElement('div', [
          createElement('div', [
            createJSXElement(JSX_IMPORTS.TableOfContents.name, {
              headings: metaBarProps.headings,
              summaryTitle: 'On this page',
            }),
            createElement('br'),
            createElement(
              'main',
              entries.map(entry => processEntry(entry, remark))
            ),
          ]),
          createJSXElement(JSX_IMPORTS.MetaBar.name, metaBarProps),
        ]),
      ],
    }),
  ]);

/**
 * @typedef {import('estree').Node & { data: ApiDocMetadataEntry }} JSXContent
 *
 * Transforms API metadata entries into processed MDX content
 * @param {Array<ApiDocMetadataEntry>} metadataEntries - API documentation metadata entries
 * @param {ApiDocMetadataEntry} head - Main API metadata entry with version information
 * @param {Object} sideBarProps - Props for the sidebar component
 * @param {import('unified').Processor} remark - Remark processor instance for markdown processing
 * @returns {Promise<JSXContent>}
 */
const buildContent = async (metadataEntries, head, sideBarProps, remark) => {
  // Build props for the MetaBar from head and entries
  const metaBarProps = buildMetaBarProps(head, metadataEntries);

  // Create root document AST with all layout components and processed content
  const root = createDocumentLayout(
    metadataEntries,
    sideBarProps,
    metaBarProps,
    remark
  );

  // Run remark processor to transform AST (parse markdown, plugins, etc.)
  const ast = await remark.run(root);

  // The final MDX content is the expression in the Program's first body node
  return { ...ast.body[0].expression, data: head };
};

export default buildContent;
