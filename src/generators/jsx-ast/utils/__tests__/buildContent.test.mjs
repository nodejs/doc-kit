import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { transformHeadingNode } from '../buildContent.mjs';

const heading = {
  type: 'heading',
  depth: 3,
  data: { type: 'misc', slug: 's', text: 'Heading' },
  children: [{ type: 'text', value: 'Heading' }],
};

const makeParent = typeText => ({
  children: [
    heading,
    {
      type: 'paragraph',
      children: [{ type: 'text', value: `Type: ${typeText}` }],
    },
  ],
});

describe('transformHeadingNode (deprecation Type -> AlertBox level)', () => {
  it('maps documentation/compilation to info', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('Documentation');
    const node = parent.children[0];

    transformHeadingNode(entry, {}, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'info');
  });

  it('maps runtime/application to warning', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('Runtime');
    const node = parent.children[0];

    transformHeadingNode(entry, {}, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'warning');
  });

  it('falls back to danger for unknown types', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('SomeOtherThing');
    const node = parent.children[0];

    transformHeadingNode(entry, {}, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'danger');
  });
});
