// Inlines the diagrams the pages reference as images (`![…](diagrams/x.svg)`),
// so that their colors follow the site's color scheme through the classes
// they use (`.il-*`, styled in `styles/diagrams.css`). The SVG files themselves
// carry fallback colors, so they still read well as plain images on GitHub.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Relative paths only: an image from elsewhere stays an image
const DIAGRAM = /^(?:\.\.?\/)*diagrams\/([\w-]+)\.svg$/;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/**
 * Decodes the entities of a text or an attribute value.
 *
 * @param {string} text
 */
const decode = text =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      return String.fromCodePoint(
        entity[1].toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1))
      );
    }

    return ENTITIES[entity] ?? match;
  });

/**
 * The hast property for an attribute: `class` becomes `className`, and dashed
 * presentation attributes are camel-cased, as hast names them.
 *
 * @param {string} name
 */
const toProperty = name =>
  name === 'class'
    ? 'className'
    : name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Parses the SVG markup of a diagram into hast. Diagrams are well-formed
 * files of our own, so elements, attributes and text are all there is to it;
 * the `<style>` holding their fallback colors is left out, and so is their
 * `<title>`, as the figure is named by the image's alt text.
 *
 * @param {string} markup
 */
const parse = markup => {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const tokens = markup.split(/(<[^>]+>)/);

  for (const token of tokens) {
    const parent = stack.at(-1);

    // The XML declaration and comments
    if (token.startsWith('<?') || token.startsWith('<!')) {
      continue;
    }

    if (!token.startsWith('<')) {
      if (token.trim()) {
        parent.children.push({ type: 'text', value: decode(token) });
      }
      continue;
    }

    if (token.startsWith('</')) {
      stack.pop();
      continue;
    }

    const [, tagName, rest] = token.match(/^<([\w:-]+)([\s\S]*?)\/?>$/);
    const properties = {};

    for (const [, name, value] of rest.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      if (name === 'xmlns' || name.startsWith('xmlns:')) {
        continue;
      }

      properties[toProperty(name)] =
        name === 'class' ? value.split(/\s+/) : decode(value);
    }

    const element = { type: 'element', tagName, properties, children: [] };
    parent.children.push(element);

    if (!token.endsWith('/>')) {
      stack.push(element);
    }
  }

  const svg = root.children.find(node => node.tagName === 'svg');
  svg.children = svg.children.filter(
    node => node.tagName !== 'style' && node.tagName !== 'title'
  );

  return svg;
};

/**
 * A checkbox that stops a diagram's motion, showing its still frame.
 */
const motion = () => ({
  type: 'element',
  tagName: 'label',
  properties: { className: ['dk-diagram__motion'] },
  children: [
    {
      type: 'element',
      tagName: 'input',
      properties: { type: 'checkbox' },
      children: [],
    },
    { type: 'text', value: 'Stop animation' },
  ],
});

/**
 * Replaces each diagram image with a figure holding the diagram's SVG.
 *
 * @param {{ directory: string }} options - Where the diagrams are
 */
export default function rehypeDiagrams({ directory }) {
  const cache = new Map();

  const load = name => {
    if (!cache.has(name)) {
      cache.set(name, readFileSync(join(directory, `${name}.svg`), 'utf-8'));
    }

    // A fresh tree each time, as later plugins may change it
    return parse(cache.get(name));
  };

  /**
   * The figure for an image, if it is a diagram.
   *
   * @param {import('hast').Element} node
   */
  const figure = node => {
    const name =
      node.tagName === 'img' && DIAGRAM.exec(node.properties?.src ?? '')?.[1];

    if (!name) {
      return null;
    }

    const svg = load(name);
    svg.properties.role = 'img';
    svg.properties.ariaLabel = node.properties.alt;

    return {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['dk-diagram'] },
      children: [svg, motion()],
    };
  };

  const walk = parent => {
    parent.children = parent.children.map(child => {
      // An image alone in its paragraph replaces the paragraph, as a figure
      // can't be inside one; anywhere else, a diagram stays an image
      const only =
        child.tagName === 'p' &&
        child.children.filter(
          node => node.type !== 'text' || node.value.trim()
        );

      if (only?.length === 1) {
        const replaced = figure(only[0]);
        if (replaced) {
          return replaced;
        }
      }

      if (child.children) {
        walk(child);
      }

      return child;
    });
  };

  return tree => walk(tree);
}
