'use strict';

import { u as createTree } from 'unist-builder';
import { findAfter } from 'unist-util-find-after';
import { remove } from 'unist-util-remove';
import { selectAll } from 'unist-util-select';
import { SKIP, visit } from 'unist-util-visit';

import createNodeSlugger from './slugger.mjs';
import { transformNodeToHeading } from './transformers.mjs';
import {
  visitLinkReference,
  visitMarkdownLink,
  visitStability,
  visitTextWithTypeNode,
  visitTextWithUnixManualNode,
  visitYAML,
} from './visitors.mjs';
import { UNIST } from '../../../utils/queries/index.mjs';
import { getRemark } from '../../../utils/remark.mjs';
import { IGNORE_STABILITY_STEMS } from '../constants.mjs';

// Creates an instance of the Remark processor with GFM support
const remarkProcessor = getRemark();

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @param {ParserOutput<import('mdast').Root>} input
 * @param {Record<string, string>} typeMap
 * @returns {Promise<Array<import('../types').MetadataEntry>>}
 */
export const parseApiDoc = ({ file, tree }, typeMap) => {
  /**
   * Collection of metadata entries for the file
   * @type {Array<import('../types').MetadataEntry>}
   */
  const metadataCollection = [];

  // Creates a new Slugger instance for the current API doc file
  const nodeSlugger = createNodeSlugger();

  // Get all Markdown Footnote definitions from the tree
  const markdownDefinitions = selectAll('definition', tree);

  // Get all Markdown Heading entries from the tree
  const headingNodes = selectAll('heading', tree);

  // Handles Markdown link references and updates them to be plain links
  visit(tree, UNIST.isLinkReference, node =>
    visitLinkReference(node, markdownDefinitions)
  );

  // Removes all the original definitions from the tree as they are not needed anymore
  remove(tree, markdownDefinitions);

  // Handles the normalisation URLs that reference to API doc files with .md extension
  visit(tree, UNIST.isMarkdownUrl, node => visitMarkdownLink(node));

  // If the document has no headings but it has content, we add a fake heading to the top
  if (headingNodes.length === 0 && tree.children.length > 0) {
    tree.children.unshift(createTree('heading', { depth: 1 }, []));
  }

  // On "About this Documentation", we define the stability indices, and thus
  // we don't need to check it for stability references
  const ignoreStability = IGNORE_STABILITY_STEMS.includes(file.stem);

  // Process each heading and create metadata entries
  visit(tree, UNIST.isHeading, (headingNode, index) => {
    // Initialize heading
    headingNode.data = transformNodeToHeading(headingNode);

    // Initialize the metadata
    const metadata = /** @type {import('../types').MetadataEntry} */ ({
      api: file.stem,
      heading: headingNode,
    });

    // Generate slug and update heading data
    metadata.heading.data.slug = nodeSlugger.slug(metadata.heading.data.text);

    // Find the next heading to determine section boundaries
    const nextHeadingNode =
      findAfter(tree, index, UNIST.isHeading) ?? headingNode;

    const stop =
      headingNode === nextHeadingNode
        ? tree.children.length
        : tree.children.indexOf(nextHeadingNode);

    // Create subtree for this section
    const subTree = createTree('root', tree.children.slice(index, stop));

    visit(subTree, UNIST.isStabilityNode, node =>
      visitStability(node, ignoreStability ? undefined : metadata)
    );

    // Process YAML nodes directly - merge all YAML data
    visit(subTree, UNIST.isYamlNode, node => visitYAML(node, metadata));

    // If YAML data contains a 'type', use it to override heading type
    if (metadata.type) {
      metadata.heading.data.type = metadata.type;
    }

    // Process type references
    visit(subTree, UNIST.isTextWithType, (node, _, parent) =>
      visitTextWithTypeNode(node, parent, typeMap)
    );

    // Process Unix manual references
    visit(subTree, UNIST.isTextWithUnixManual, (node, _, parent) =>
      visitTextWithUnixManualNode(node, parent)
    );

    // Remove processed YAML nodes from the content
    remove(subTree, [UNIST.isYamlNode]);

    // Apply AST transformations
    const parsedSubTree = remarkProcessor.runSync(subTree);
    metadata.content = parsedSubTree;

    // Add to collection
    metadataCollection.push(metadata);

    return SKIP;
  });

  return metadataCollection;
};
