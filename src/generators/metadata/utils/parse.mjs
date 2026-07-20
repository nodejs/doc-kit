'use strict';

import { basename, sep } from 'node:path/posix';

import { slug } from 'github-slugger';
import { u as createTree } from 'unist-builder';
import { remove } from 'unist-util-remove';
import { visit } from 'unist-util-visit';

import createNodeSlugger from './slugger.mjs';
import { transformNodeToHeading } from './transformers.mjs';
import {
  visitLinkReference,
  visitMarkdownLink,
  visitStability,
  visitTextWithUnixManualNode,
  visitYAML,
} from './visitors.mjs';
import { UNIST } from '../../../utils/queries/index.mjs';
import { getRemark as remark } from '../../../utils/remark.mjs';
import { relative } from '../../../utils/url.mjs';
import { IGNORE_STABILITY_STEMS } from '../constants.mjs';
import { resolveTypeAnnotations } from './resolveTypes.mjs';

/**
 * Creates relative links for all known type references.
 *
 * This is executed once per document instead of repeatedly
 * while processing individual sections.
 *
 * @param {Record<string, string>} typeMap
 * @param {string} path
 * @returns {Record<string, string>}
 */
const createRelativeTypeMap = (typeMap, path) =>
  Object.fromEntries(
    Object.entries(typeMap).map(([type, url]) => [type, relative(url, path)])
  );

/**
 * This generator generates a flattened list of metadata entries from an API doc
 *
 * @param {{ tree: import('mdast.Root'), mdx?: boolean } & import('../types').MetadataEntry} input
 * @param {Record<string, string>} typeMap
 * @returns {Array<import('../types').MetadataEntry>}
 */
export const parseApiDoc = ({ path, tree, mdx = false }, typeMap) => {
  /**
   * Collection of generated metadata entries.
   *
   * @type {Array<import('../types').MetadataEntry>}
   */
  const metadataCollection = [];

  /**
   * Slug generator for headings in this document.
   */
  const nodeSlugger = createNodeSlugger();

  /**
   * Values reused throughout parsing.
   */
  const api = slug(path.slice(1).replace(sep, '-'));
  const fileName = basename(path);

  /**
   * Collect definitions and headings in a single AST traversal.
   *
   * The heading index is stored because we need the original
   * position inside tree.children for section slicing.
   *
   * This avoids:
   * - selectAll() traversals
   * - findAfter() searches
   * - indexOf() lookups later
   */
  const markdownDefinitions = [];
  const headingNodes = [];

  visit(tree, (node, index, parent) => {
    if (UNIST.isDefinition(node)) {
      markdownDefinitions.push(node);
    }

    /**
     * Only headings directly under the root define sections.
     *
     * Nested headings should not split the document.
     */
    if (UNIST.isHeading(node) && parent === tree) {
      headingNodes.push({
        node,
        index,
      });
    }
  });

  /**
   * Resolve Markdown reference links.
   */
  visit(tree, UNIST.isLinkReference, node =>
    visitLinkReference(node, markdownDefinitions)
  );

  /**
   * Definitions are no longer needed after references
   * have been converted.
   */
  remove(tree, markdownDefinitions);

  /**
   * Resolve type annotation links once per document.
   *
   * MDX skips this because typeAnnotation nodes are not
   * real syntax there.
   */
  if (!mdx) {
    resolveTypeAnnotations(tree, createRelativeTypeMap(typeMap, path), path);
  }

  /**
   * Normalize markdown API links.
   */
  visit(tree, UNIST.isMarkdownUrl, node => visitMarkdownLink(node));

  /**
   * Documents without headings still need a section
   * if they contain content.
   */
  if (headingNodes.length === 0 && tree.children.length > 0) {
    const fakeHeading = createTree('heading', { depth: 1 }, []);

    tree.children.unshift(fakeHeading);

    headingNodes.push({
      node: fakeHeading,
      index: 0,
    });
  }

  /**
   * Documentation files define their own stability index.
   */
  const ignoreStability = IGNORE_STABILITY_STEMS.includes(api);

  /**
   * Process each section heading.
   */
  for (let i = 0; i < headingNodes.length; i++) {
    const { node: headingNode, index: startHeadingIndex } = headingNodes[i];

    /**
     * Initialize heading metadata.
     */
    headingNode.data = transformNodeToHeading(headingNode);

    const metadata =
      /** @type {import('../types').MetadataEntry} */
      ({
        api,
        path,
        mdx,
        basename: fileName,
        heading: headingNode,
      });

    /**
     * Generate a unique slug for this heading.
     */
    metadata.heading.data.slug = nodeSlugger.slug(metadata.heading.data.text);

    /**
     * Find the end of this section.
     *
     * Using the stored heading indexes avoids
     * findAfter() and repeated searching.
     */
    const stop = headingNodes[i + 1]?.index ?? tree.children.length;

    /**
     * The first section includes document-level
     * nodes such as YAML/frontmatter.
     */
    const startIndex = metadataCollection.length === 0 ? 0 : startHeadingIndex;

    /**
     * Create a temporary tree containing only
     * this section's content.
     */
    const subTree = createTree('root', tree.children.slice(startIndex, stop));

    /**
     * Extract stability metadata.
     */
    visit(subTree, UNIST.isStabilityNode, node =>
      visitStability(node, ignoreStability ? undefined : metadata)
    );

    /**
     * Extract YAML metadata.
     */
    visit(subTree, UNIST.isYamlNode, node => visitYAML(node, metadata));

    /**
     * YAML type overrides heading type.
     */
    if (metadata.type) {
      metadata.heading.data.type = metadata.type;
    }

    /**
     * Convert Unix manual references.
     */
    visit(subTree, UNIST.isTextWithUnixManual, (node, _, parent) =>
      visitTextWithUnixManualNode(node, parent)
    );

    /**
     * Remove YAML metadata nodes from the
     * final rendered content.
     */
    remove(subTree, [UNIST.isYamlNode]);

    /**
     * Apply remark transformations.
     */
    metadata.content = remark().runSync(subTree);

    /**
     * Store final metadata entry.
     */
    metadataCollection.push(metadata);
  }

  return metadataCollection;
};
