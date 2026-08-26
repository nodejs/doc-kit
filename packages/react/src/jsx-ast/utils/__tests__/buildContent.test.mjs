import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import {
  transformHeadingNode,
  gatherChangeEntries,
  groupOverloadsIntoTabs,
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

/**
 * Collects the tag names of every JSX element within a JSX AST node.
 *
 * @param {import('estree-jsx').JSXFragment} node
 */
const jsxElementNames = node =>
  (node.children ?? []).flatMap(child =>
    child.type === 'JSXElement'
      ? [child.openingElement.name.name, ...jsxElementNames(child)]
      : jsxElementNames(child)
  );

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

describe('gatherChangeEntries', () => {
  it('returns empty array when entry has no changes', () => {
    assert.deepEqual(gatherChangeEntries({}), []);
  });

  it('collects lifecycle changes with formatted labels', () => {
    const result = gatherChangeEntries({
      added: ['v20.0.0', 'v18.0.0'],
      deprecated: 'v22.0.0',
    });

    assert.equal(result.length, 2);
    assert.deepEqual(result[0], {
      versions: ['v20.0.0', 'v18.0.0'],
      label: 'Added in: v20.0.0, v18.0.0',
    });
    assert.deepEqual(result[1], {
      versions: ['v22.0.0'],
      label: 'Deprecated in: v22.0.0',
    });
  });

  it('extracts plain text labels from markdown descriptions', () => {
    const result = gatherChangeEntries({
      changes: [
        {
          version: 'v25.0.0',
          description:
            'Add `modifyPrototype` option to conditionally modify the prototype.',
          'pr-url': 'https://github.com/nodejs/node/pull/123',
        },
      ],
    });

    assert.equal(result.length, 1);
    assert.equal(
      result[0].label,
      'Add `modifyPrototype` option to conditionally modify the prototype.'
    );
    assert.equal(result[0].url, 'https://github.com/nodejs/node/pull/123');
    assert.deepEqual(result[0].versions, ['v25.0.0']);
  });

  it('renders the markdown description as JSX content', () => {
    const [change] = gatherChangeEntries({
      changes: [
        {
          version: 'v25.0.0',
          description: 'Add `modifyPrototype` option.',
        },
      ],
    });

    assert.equal(change.content.type, 'JSXFragment');
    assert.deepEqual(jsxElementNames(change.content), ['code']);
  });

  it('unwraps description links when the change links to its pull request', () => {
    const description = 'Superseded by [DEP0111](#DEP0111).';

    const [linked] = gatherChangeEntries({
      changes: [
        {
          version: 'v1.0.0',
          description,
          'pr-url': 'https://example.com/pr/1',
        },
      ],
    });

    const [unlinked] = gatherChangeEntries({
      changes: [{ version: 'v1.0.0', description }],
    });

    assert.deepEqual(jsxElementNames(linked.content), []);
    assert.deepEqual(jsxElementNames(unlinked.content), ['a']);
    assert.equal(linked.label, 'Superseded by DEP0111.');
  });

  it('produces a string label, not an object (regression for [object Object])', () => {
    const result = gatherChangeEntries({
      changes: [
        {
          version: 'v1.0.0',
          description: 'Some **bold** and _italic_ text.',
        },
      ],
    });

    assert.equal(typeof result[0].label, 'string');
    assert.equal(result[0].label, 'Some **bold** and _italic_ text.');
  });

  it('combines lifecycle changes and explicit changes', () => {
    const result = gatherChangeEntries({
      added: 'v20.0.0',
      changes: [
        {
          version: 'v21.0.0',
          description: 'Added new feature.',
          'pr-url': 'https://example.com/pr/1',
        },
      ],
    });

    assert.equal(result.length, 2);
    assert.equal(result[0].label, 'Added in: v20.0.0');
    assert.equal(result[1].label, 'Added new feature.');
  });
});

describe('groupOverloadsIntoTabs', () => {
  it('groups consecutive overloads into a single OverloadTabs component', () => {
    const originalEntries = [
      { heading: { data: { name: 'funcA', isOverload: false } } },
      { heading: { depth: 3, data: { name: 'funcB', isOverload: false } } },
      { heading: { depth: 3, data: { name: 'funcB', isOverload: true } } },
      { heading: { depth: 3, data: { name: 'funcB', isOverload: true } } },
      { heading: { data: { name: 'funcC', isOverload: false } } },
    ];

    const getText = node => {
      if (node.type === 'text') {
        return node.value;
      }
      return (node.children || []).map(getText).join('');
    };

    const makeNode = (className, bodyText, sigText = null) => {
      const children = [
        { type: 'element', tagName: 'h3', depth: 3 }, // The heading to be stripped
        { type: 'text', value: bodyText },
      ];

      if (sigText) {
        children.push({
          type: 'element',
          tagName: 'div',
          properties: { class: 'signature', dataSignatureRaw: sigText },
        });
      }

      return {
        type: 'element',
        tagName: 'div',
        properties: { className },
        children,
      };
    };

    const processedChildren = [
      makeNode('entry-a', 'body a'),
      makeNode('entry-b1', 'body b1', 'function funcB(arg1);'),
      makeNode('entry-b2', 'body b2', 'function funcB(arg1, arg2);'),
      makeNode('entry-b3', 'body b3', 'function funcB(arg1, arg2, arg3);'),
      makeNode('entry-c', 'body c'),
    ];

    const result = groupOverloadsIntoTabs(processedChildren, originalEntries);

    // 0: funcA, 1: funcB-heading, 2: CombinedSignatures, 3: CodeTabs(funcB), 4: funcC
    assert.equal(result.length, 5);

    // First element is untouched
    assert.equal(result[0].properties.className, 'entry-a');

    // Second element is the extracted heading
    assert.equal(result[1].tagName, 'h3');

    // Third element is the combined signatures block
    const combinedSigBlock = result[2];
    assert.deepEqual(combinedSigBlock.properties.className, ['signature']);

    // Assert that the combined signatures contain the raw signatures without comments
    const combinedText = getText(combinedSigBlock);
    assert.match(combinedText, /function funcB\(arg1\);/);
    assert.match(combinedText, /function funcB\(arg1, arg2\);/);
    assert.match(combinedText, /function funcB\(arg1, arg2, arg3\);/);

    // Fourth element is the CodeTabs component
    const tabsComponent = result[3];
    assert.equal(tabsComponent.name, 'CodeTabs');
    const languagesAttr = tabsComponent.attributes.find(
      a => a.name === 'languages'
    );
    const displayNamesAttr = tabsComponent.attributes.find(
      a => a.name === 'displayNames'
    );
    assert.equal(languagesAttr.value, 'overload|overload|overload');
    assert.equal(displayNamesAttr.value, 'Overload #1|Overload #2|Overload #3');
    assert.equal(tabsComponent.children.length, 3); // 3 tab panels

    // Check that the h3 was removed from the overloads and they are wrapped in overload-panel
    const panel1 = tabsComponent.children[0];
    const classAttr1 = panel1.attributes.find(a => a.name === 'className');
    assert.equal(classAttr1.value, 'overload-panel');

    // Second panel child should be the text we inserted
    assert.equal(panel1.children[0].value, 'body b1');
    assert.equal(result[4].properties.className, 'entry-c');

    const panel2 = tabsComponent.children[1];
    const classAttr2 = panel2.attributes.find(a => a.name === 'className');
    assert.equal(classAttr2.value, 'overload-panel');
    assert.equal(panel2.children[0].type, 'text');
    assert.equal(panel2.children[0].value, 'body b2');
  });
});
