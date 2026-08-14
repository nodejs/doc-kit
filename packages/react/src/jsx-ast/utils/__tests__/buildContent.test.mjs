import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import {
  transformHeadingNode,
  createHeadingElement,
} from '../buildContent.mjs';

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

await setConfig({});

describe('transformHeadingNode (deprecation Type -> AlertBox level)', () => {
  it('maps documentation/compilation to info', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('Documentation');
    const node = parent.children[0];

    transformHeadingNode(entry, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'info');
  });

  it('maps runtime/application to warning', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('Runtime');
    const node = parent.children[0];

    transformHeadingNode(entry, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'warning');
  });

  it('falls back to danger for unknown types', () => {
    const entry = { api: 'deprecations' };
    const parent = makeParent('SomeOtherThing');
    const node = parent.children[0];

    transformHeadingNode(entry, node, 0, parent);

    const alert = parent.children[1];
    const levelAttr = alert.attributes.find(a => a.name === 'level');

    assert.equal(alert.name, 'AlertBox');
    assert.equal(levelAttr.value, 'danger');
  });
});

describe('createHeadingElement (Overloads Layout)', () => {
  it('returns a hidden span for subsequent overloads to prevent UI noise', () => {
    const content = {
      depth: 3,
      data: { type: 'method', slug: 'factorizemodule-1', isOverload: true },
    };

    const result = createHeadingElement(content, null);

    assert.equal(result.type, 'element');
    assert.equal(result.tagName, 'span');
    assert.equal(result.properties.id, 'factorizemodule-1');
    assert.equal(result.properties.style, 'display: none;');
  });

  it('returns a full heading element for normal methods (non-overloads)', () => {
    const content = {
      depth: 3,
      data: { type: 'method', slug: 'factorizemodule' },
    };

    const result = createHeadingElement(content, null);

    assert.equal(result.tagName, 'div');
    const h3 = result.children.find(child => child.tagName === 'h3');
    assert.ok(h3);
    assert.equal(h3.properties.id, 'factorizemodule');
  });
});
