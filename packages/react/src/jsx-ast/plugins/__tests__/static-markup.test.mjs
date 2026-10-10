import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createHighlighter } from '@doc-kit/core/plugins/shiki/highlighter.mjs';
import { createTypeAnnotationHandler } from '@doc-kit/core/plugins/type-annotations/highlighter.mjs';
import { toString } from 'hast-util-to-string';
import rehypeRaw from 'rehype-raw';
import { unified } from 'unified';

import rehypeStaticMarkup, {
  embedHighlightedTypes,
} from '../static-markup.mjs';

const highlighter = await createHighlighter();

const embedTypes = embedHighlightedTypes(
  createTypeAnnotationHandler(() => highlighter)
);

// A minimal mdast-util-to-hast state: the handlers only use patch/applyData
const state = { patch: () => {}, applyData: (_, result) => result };

/**
 * The text an HTML fragment reads as, parsed as a browser would parse it.
 *
 * @param {string} html
 */
const textContent = html =>
  toString(
    unified()
      .use(rehypeRaw)
      .runSync({ type: 'root', children: [{ type: 'raw', value: html }] })
  );

/**
 * Reads an attribute of a JSX element: its value, or the value of the object
 * it's given (as `dangerouslySetInnerHTML` is).
 *
 * @param {{ attributes: Array<{ name: string, value: unknown }> }} element
 * @param {string} name
 */
const attribute = (element, name) => {
  const { value } = element.attributes.find(entry => entry.name === name);

  if (typeof value === 'string') {
    return value;
  }

  const [{ expression }] = value.data.estree.body;

  return Object.fromEntries(
    expression.properties.map(({ key, value: entry }) => [
      key.name,
      entry.value,
    ])
  );
};

/**
 * The markup a JSX `<code>` holds through `dangerouslySetInnerHTML`.
 *
 * @param {{ attributes: Array<{ name: string, value: unknown }> }} element
 */
const innerHTML = element =>
  attribute(element, 'dangerouslySetInnerHTML').__html;

describe('rehypeStaticMarkup', () => {
  const embed = rehypeStaticMarkup();

  it("embeds a highlighted block's code as the markup it renders to", () => {
    const tree = highlighter.highlightToHast('const a = 1;', 'js');
    const [pre] = tree.children;

    embed(tree);

    // The <pre> stays as it is, for the code box to render
    assert.equal(pre.tagName, 'pre');
    assert.match(pre.properties.class, /^shiki /);

    const [code] = pre.children;

    assert.equal(code.type, 'mdxJsxFlowElement');
    assert.equal(code.name, 'code');
    assert.equal(code.children.length, 0);
    // Rendered by Preact, as the page itself would render it
    assert.match(
      innerHTML(code),
      /^<span class="line"><span style="color:#[0-9A-F]+;--shiki-dark:#[0-9A-F]+;">const<\/span>/i
    );
    assert.equal(textContent(innerHTML(code)), 'const a = 1;');
  });

  it('leaves code that was not highlighted as it is', () => {
    const code = {
      type: 'element',
      tagName: 'code',
      properties: { className: ['language-js'] },
      children: [{ type: 'text', value: 'a();' }],
    };

    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'pre', properties: {}, children: [code] },
      ],
    };

    embed(tree);

    assert.equal(tree.children[0].children[0], code);
  });
});

describe('embedHighlightedTypes', () => {
  const makeNode = (value, data) => ({ type: 'typeAnnotation', value, data });

  it('embeds a highlighted type as one inline <code>, its links included', () => {
    const element = embedTypes(
      state,
      makeNode('Promise<string>', {
        typescript: true,
        links: [{ start: 0, end: 7, text: 'Promise', href: 'mdn.io/promise' }],
      })
    );

    assert.equal(element.type, 'mdxJsxTextElement');
    assert.equal(element.name, 'code');
    assert.match(attribute(element, 'className'), /^shiki .* type$/);

    const html = innerHTML(element);

    assert.match(html, /<a href="mdn.io\/promise" class="type-link">/);
    assert.doesNotMatch(html, /<pre|<code/);
    assert.equal(textContent(html), 'Promise<string>');
  });

  it('leaves a type that was not highlighted as it is', () => {
    const element = embedTypes(state, makeNode('Whatever', { links: [] }));

    assert.equal(element.type, 'element');
    assert.deepStrictEqual(element.properties, { className: ['type'] });
  });
});
