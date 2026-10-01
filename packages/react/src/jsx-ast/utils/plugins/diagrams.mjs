'use strict';

import { visit } from 'unist-util-visit';

/**
 * Graphviz, when the optional `@hpcc-js/wasm-graphviz` dependency is
 * installed. Loaded up front, as the Markdown pipeline runs synchronously.
 *
 * @type {import('@hpcc-js/wasm-graphviz').Graphviz | undefined}
 */
const graphviz = await import('@hpcc-js/wasm-graphviz')
  .then(({ Graphviz }) => Graphviz.load())
  .catch(() => undefined);

/** A color for each color scheme: `${#3c3c43|#dfdfd6}` */
const THEMED_COLOR = /\$\{([^|}]*)\|([^}]*)\}/g;

/**
 * Renders DOT source as an inline SVG.
 *
 * @param {string} dot
 */
const render = dot =>
  graphviz
    .dot(dot, 'svg_inline')
    // A blank line would end the HTML block the SVG is embedded in
    .replace(/\n\s*\n/g, '\n')
    .trim();

/**
 * Renders a diagram. One using colors for each color scheme renders twice,
 * one SVG per scheme, the page's styles showing the one of the current
 * scheme.
 *
 * @param {string} dot
 */
export const renderDiagram = dot => {
  if (!dot.includes('${')) {
    return `<div class="diagram">${render(dot)}</div>`;
  }

  return ['light', 'dark']
    .map(scheme => {
      const colors = dot.replace(THEMED_COLOR, (_, light, dark) =>
        scheme === 'light' ? light : dark
      );

      return `<div class="diagram diagram-${scheme}">${render(colors)}</div>`;
    })
    .join('\n');
};

/**
 * Renders ```dot code blocks as Graphviz diagrams, when Graphviz is
 * installed; otherwise, they stay code blocks.
 *
 * @param {import('mdast').Root} tree
 */
const transformer = tree => {
  if (!graphviz) {
    return;
  }

  visit(tree, 'code', (node, index, parent) => {
    if (node.lang !== 'dot') {
      return;
    }

    parent.children[index] = { type: 'html', value: renderDiagram(node.value) };
  });
};

/**
 * The remark plugin rendering Graphviz diagrams.
 */
export default () => transformer;
