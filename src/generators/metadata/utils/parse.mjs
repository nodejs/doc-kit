'use strict';

import { u as createTree } from 'unist-builder';
import { findAfter } from 'unist-util-find-after';
import { remove } from 'unist-util-remove';
import { selectAll } from 'unist-util-select';
import { SKIP, visit } from 'unist-util-visit';

import createMetadata from '../../../metadata.mjs';
import createNodeSlugger from '../../../utils/parser/slugger.mjs';
import createQueries from '../../../utils/queries/index.mjs';
import { getRemark } from '../../../utils/remark.mjs';
import { IGNORE_STABILITY_STEMS } from '../constants.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @param {ParserOutput<import('mdast').Root>} input
 * @param {Record<string, string>} typeMap
 * @returns {Promise<Array<ApiDocMetadataEntry>>}
 */
export const parseApiDoc = ({ file, tree }, typeMap) => {
  /**
   * This holds references to all the Metadata entries for a given file
   * this is used so we can traverse the AST tree and keep mutating things
   * and then stringify the whole api doc file at once without creating sub traversals
   *
   * Then once we have the whole file parsed, we can split the resulting string into sections
   * and seal the Metadata Entries (`.create()`) and return the result to the caller of parae.
   *
   * @type {Array<ApiDocMetadataEntry>}
   */
  const metadataCollection = [];

  const {
    setHeadingMetadata,
    addYAMLMetadata,
    updateMarkdownLink,
    updateTypeReference,
    updateUnixManualReference,
    updateLinkReference,
    addStabilityMetadata,
  } = createQueries(typeMap);

  // Creates an instance of the Remark processor with GFM support
  // which is used for stringifying the AST tree back to Markdown
  const remarkProcessor = getRemark();

  // Creates a new Slugger instance for the current API doc file
  const nodeSlugger = createNodeSlugger();

  // Get all Markdown Footnote definitions from the tree
  const markdownDefinitions = selectAll('definition', tree);

  // Get all Markdown Heading entries from the tree
  const headingNodes = selectAll('heading', tree);

  // visit(tree, node => {
  //   let skip = false;

  //   // Update Markdown link references to be plain links
  //   if (is(node, createQueries.UNIST.isLinkReference)) {
  //     skip = true;
  //     updateLinkReference(node, markdownDefinitions);
  //   }

  //   // Normalizes URLs that reference API doc files with .md extensions to
  //   // be .html instead, since the files will eventually get compiled as HTML
  //   if (is(node, createQueries.UNIST.isMarkdownUrl)) {
  //     skip = true;
  //     updateMarkdownLink(node);
  //   }

  //   return skip ? SKIP : undefined;
  // });

  // Handles Markdown link references and updates them to be plain links
  visit(tree, createQueries.UNIST.isLinkReference, node => {
    updateLinkReference(node, markdownDefinitions);
    return [SKIP];
  });

  // Removes all the original definitions from the tree as they are not needed
  // anymore, since all link references got updated to be plain links
  remove(tree, markdownDefinitions);

  visit(tree, createQueries.UNIST.isMarkdownUrl, node => {
    updateMarkdownLink(node);
    return [SKIP];
  });

  // If the document has no headings but it has content, we add a fake heading to the top
  // so that our parsing logic can work correctly, and generate content for the whole file
  if (headingNodes.length === 0 && tree.children.length > 0) {
    tree.children.unshift(createTree('heading', { depth: 1 }, []));
  }

  // On "About this Documentation", we define the stability indices, and thus
  // we don't need to check it for stability references
  const ignoreStability = IGNORE_STABILITY_STEMS.includes(file.stem);

  // Handles iterating the tree and creating subtrees for each API doc entry
  // where an API doc entry is defined by a Heading Node
  // (so all elements after a Heading until the next Heading)
  // and then it creates and updates a Metadata entry for each API doc entry
  // and then generates the final content for each API doc entry and pushes it to the collection
  visit(tree, createQueries.UNIST.isHeading, (headingNode, index) => {
    // Creates a new Metadata entry for the current API doc file
    const apiEntryMetadata = createMetadata(nodeSlugger);

    // Adds the Metadata of the current Heading Node to the Metadata entry
    setHeadingMetadata(headingNode, apiEntryMetadata);

    // We retrieve the immediate next Heading if it exists
    // This is used for ensuring that we don't include items that would
    // belong only to the next heading to the current Heading metadata
    // Note that if there is no next heading, we use the current node as the next one
    const nextHeadingNode =
      findAfter(tree, index, createQueries.UNIST.isHeading) ?? headingNode;

    // This is the cutover index of the subtree that we should get
    // of all the Nodes within the AST tree that belong to this section
    // If `next` is equals the current heading, it means there's no next heading
    // and we are reaching the end of the document, hence the cutover should be the end of
    // the document itself.
    const stop =
      headingNode === nextHeadingNode
        ? tree.children.length
        : tree.children.indexOf(nextHeadingNode);

    // Retrieves all the nodes that should belong to the current API docs section
    // `index + 1` is used to skip the current Heading Node
    const subTree = createTree('root', tree.children.slice(index, stop));

    visit(subTree, (node, index, parent) => {
      let skip = false;

      // Applies stability index metadata if present
      if (createQueries.UNIST.isStabilityNode(node)) {
        skip = true;

        addStabilityMetadata(
          node,
          ignoreStability ? undefined : apiEntryMetadata
        );
      }

      // Transform any YAML metadata and then apply it to the current
      // metadata entry
      if (createQueries.UNIST.isYamlNode(node)) {
        // TODO: Is there always only one YAML node?
        apiEntryMetadata.setYamlPosition(node.position);
        addYAMLMetadata(node, apiEntryMetadata);
      }

      let valueUpdated = false;

      if (createQueries.UNIST.isTextWithType(node)) {
        skip = true;

        valueUpdated = true;
        node.value = updateTypeReference(node);
      }

      if (createQueries.UNIST.isTextWithUnixManual(node)) {
        skip = true;

        valueUpdated = true;
        node.value = updateUnixManualReference(node);
      }

      if (valueUpdated) {
        // This changes the type into a link by splitting it up into several nodes,
        // and adding those nodes to the parent.
        const {
          children: [newNode],
        } = remarkProcessor.parse(node.value);

        // Replace the original node with the new node(s)
        parent.children.splice(index, 1, ...newNode.children);
      }

      return skip ? SKIP : undefined;
    });

    // Visits all Text nodes from the current subtree and if there's any that matches
    // any API doc type reference and then updates the type reference to be a Markdown link
    // visit(subTree, createQueries.UNIST.isTextWithType, (node, _, parent) => {
    //   updateTypeReference(node, parent);
    //   return SKIP;
    // });

    // Visits all Unix manual references, and replaces them with links
    // visit(
    //   subTree,
    //   createQueries.UNIST.isTextWithUnixManual,
    //   (node, _, parent) => {
    //     updateUnixManualReference(node, parent);
    //     return SKIP;
    //   }
    // );

    // Removes already parsed items from the subtree so that they aren't included in the final content
    remove(subTree, [createQueries.UNIST.isYamlNode]);

    // Applies the AST transformations to the subtree based on the API doc entry Metadata
    // Note that running the transformation on the subtree isn't costly as it is a reduced tree
    // and the GFM transformations aren't that heavy
    const parsedSubTree = remarkProcessor.runSync(subTree);

    // We seal and create the API doc entry Metadata and push them to the collection
    const parsedApiEntryMetadata = apiEntryMetadata.create(file, parsedSubTree);

    // We push the parsed API doc entry Metadata to the collection
    metadataCollection.push(parsedApiEntryMetadata);

    return SKIP;
  });

  return metadataCollection;
};
