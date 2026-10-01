import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import transformDiagrams, { renderDiagram } from '../diagrams.mjs';

const transform = transformDiagrams();

describe('transformDiagrams', () => {
  it('renders ```dot code blocks as inline SVG', () => {
    const tree = u('root', [u('code', { lang: 'dot' }, 'digraph { a -> b }')]);

    transform(tree);

    const [node] = tree.children;
    assert.equal(node.type, 'html');
    assert.match(
      node.value,
      /^<div class="diagram">[\s\S]*<svg[\s\S]*<\/svg><\/div>$/
    );
    assert.doesNotMatch(node.value, /\n\s*\n/);
  });

  it('leaves other code blocks alone', () => {
    const code = u('code', { lang: 'js' }, 'a -> b');
    const tree = u('root', [code]);

    transform(tree);

    assert.equal(tree.children[0], code);
  });
});

describe('renderDiagram', () => {
  it('renders a diagram per color scheme for themed colors', () => {
    const html = renderDiagram('digraph { a [color="${#000000|#ffffff}"] }');

    assert.match(html, /class="diagram diagram-light"/);
    assert.match(html, /class="diagram diagram-dark"/);
    assert.match(html.split('diagram-dark')[0], /#000000/);
    assert.match(html.split('diagram-dark')[1], /#ffffff/);
  });
});
