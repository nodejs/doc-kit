'use strict';

/**
 * Generates the Table of Contents (ToC) based on the API metadata nodes.
 * it uses the `node.heading.depth` property to determine the depth of the ToC,
 * the `node.heading.text` property to get the label/text of the ToC entry, and
 * the `node.slug` property to generate the link to the section.
 *
 * This generates a Markdown string containing a list as the ToC for the API documentation.
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} entries The API metadata nodes to be used for the ToC
 * @param {{ maxDepth: number; parser: (metadata: import('../../../metadata/types').MetadataEntry) => string }} options The optional ToC options
 */
const buildToC = (entries, options) => {
  // Filter out the entries that have a name property / or that have empty content
  const validEntries = entries.filter(({ heading }) => heading.data.name);

  // Generate the ToC based on the API headings (sections)
  return validEntries.reduce((acc, entry) => {
    // Check if the depth of the heading is less than or equal to the maximum depth
    if (entry.heading.depth <= options.maxDepth) {
      // Generate the indentation based on the depth of the heading
      const indent = '  '.repeat(entry.heading.depth - 1);

      // Append the ToC entry to the accumulator
      acc += `${indent}- ${options.parser(entry)}\n`;
    }

    return acc;
  }, '');
};

/**
 * Builds the Label with extra metadata to be used in the ToC
 *
 * @param {import('../../../metadata/types').MetadataEntry} metadata The current node that is being parsed
 */
export const parseNavigationNode = ({ api, heading }) =>
  `<a class="nav-${api}" href="${api}.html">${heading.data.name}</a>`;

/**
 * Builds the Label with extra metadata to be used in the ToC
 *
 * @param {import('../../../metadata/types').MetadataEntry} metadata
 */
export const parseToCNode = ({ stability, api, heading }) => {
  const fullSlug = `${api}.html#${heading.data.slug}`;

  if (stability) {
    return (
      `<span class="stability_${parseInt(stability.data.index)}">` +
      `<a href="${fullSlug}">${heading.data.text}</a></span>`
    );
  }

  // Otherwise, just the plain text of the heading with a link
  return `<a href="${fullSlug}">${heading.data.text}</a>`;
};

/**
 * Wraps the Table of Contents (ToC) with a template
 * used for rendering within the page template
 *
 * @param {string} tocContent
 */
export const wrapToC = tocContent => {
  if (tocContent && tocContent.length > 0) {
    return (
      `<details role="navigation" id="toc" open>` +
      `<summary>Table of contents</summary>${tocContent}</details>`
    );
  }

  return '';
};

export default buildToC;
