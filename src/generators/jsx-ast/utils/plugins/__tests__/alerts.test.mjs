import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import transformAlerts from '../alerts.mjs';

/**
 * Builds a blockquote whose first paragraph leads with `markerLine`, mimicking
 * how remark-parse represents `> [!NOTE]\n> body` (a soft break is a `\n`
 * inside the leading text node).
 */
const makeTree = (markerLine, body = 'Body text.') =>
  u('root', [
    u('blockquote', [u('paragraph', [u('text', `${markerLine}\n${body}`)])]),
  ]);

const getAttr = (node, name) =>
  node.attributes.find(attr => attr.name === name)?.value;

describe('transformAlerts', () => {
  for (const [marker, level, title] of [
    ['[!NOTE]', 'neutral', 'Note'],
    ['[!TIP]', 'success', 'Tip'],
    ['[!IMPORTANT]', 'info', 'Important'],
    ['[!WARNING]', 'warning', 'Warning'],
    ['[!CAUTION]', 'danger', 'Caution'],
  ]) {
    it(`maps ${marker} to an AlertBox (${level})`, () => {
      const tree = makeTree(marker);

      transformAlerts()(tree);

      const alert = tree.children[0];

      assert.equal(alert.type, 'mdxJsxFlowElement');
      assert.equal(alert.name, 'AlertBox');
      assert.equal(getAttr(alert, 'level'), level);
      assert.equal(getAttr(alert, 'title'), title);
    });
  }

  it('strips the marker but keeps the alert body', () => {
    const tree = makeTree('[!NOTE]', 'Highlights information.');

    transformAlerts()(tree);

    const text = tree.children[0].children[0].children[0];

    assert.equal(text.type, 'text');
    assert.equal(text.value, 'Highlights information.');
  });

  it('drops the leading paragraph when the marker is alone', () => {
    const tree = u('root', [
      u('blockquote', [
        u('paragraph', [u('text', '[!TIP]')]),
        u('paragraph', [u('text', 'Second paragraph.')]),
      ]),
    ]);

    transformAlerts()(tree);

    const alert = tree.children[0];

    assert.equal(alert.children.length, 1);
    assert.equal(alert.children[0].children[0].value, 'Second paragraph.');
  });

  it('ignores blockquotes without an alert marker', () => {
    const tree = u('root', [
      u('blockquote', [u('paragraph', [u('text', 'Just a quote.')])]),
    ]);

    transformAlerts()(tree);

    assert.equal(tree.children[0].type, 'blockquote');
  });

  it('ignores unknown markers', () => {
    const tree = makeTree('[!FOOBAR]');

    transformAlerts()(tree);

    assert.equal(tree.children[0].type, 'blockquote');
  });
});
