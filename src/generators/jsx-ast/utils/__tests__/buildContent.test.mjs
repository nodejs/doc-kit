import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

mock.module('../../../../utils/queries/index.mjs', {
  defaultExport: {
    UNIST: {
      isStabilityNode: node => node.type === 'blockquote' && node.data?.index,
      isHeading: node => node.type === 'heading',
      isTypedList: node => node.type === 'list' && node.data?.typed,
    },
  },
});

mock.module('mdast-util-slice-markdown', {
  namedExports: {
    slice: () => ({
      node: {
        children: [
          {
            children: [{ type: 'text', value: 'sliced' }],
          },
        ],
      },
    }),
  },
});

const createJSXElement = (name, props = {}) => ({ type: 'jsx', name, props });

mock.module('../ast.mjs', {
  namedExports: { createJSXElement },
});

const createPropertyTable = mock.fn(node => ({ type: 'table', from: node }));
mock.module('../buildPropertyTable.mjs', {
  defaultExport: createPropertyTable,
});

const insertSignature = mock.fn();
const getFullName = mock.fn(() => 'Full.Name');
mock.module('../buildSignature.mjs', {
  defaultExport: insertSignature,
  namedExports: { getFullName },
});

mock.module('../buildBarProps.mjs', {
  namedExports: {
    buildMetaBarProps: () => ({ meta: true }),
  },
});

const mod = await import('../buildContent.mjs');

const {
  gatherChangeEntries,
  createChangeElement,
  createSourceLink,
  extractHeadingContent,
  createHeadingElement,
  transformStabilityNode,
  transformHeadingNode,
  processEntry,
  createDocumentLayout,
} = mod;

const buildContent = mod.default;

describe('jsx-ast/utils/buildContent', () => {
  it('gathers lifecycle + explicit change entries', () => {
    const remark = {
      parse: mock.fn(() => ({})),
      runSync: mock.fn(() => ({ body: [{ expression: 'parsed label' }] })),
    };

    const entry = {
      added_in: 'v1.0.0',
      changes: [
        { version: 'v2.0.0', description: '* hi', 'pr-url': 'https://x' },
      ],
    };

    const out = gatherChangeEntries(entry, remark);

    assert.equal(out.length, 2);
    assert.equal(out[0].label, 'Added in: v1.0.0');
    assert.equal(out[1].label, 'parsed label');
    assert.equal(out[1].url, 'https://x');
  });

  it('creates ChangeHistory element or returns null', () => {
    const remark = {
      parse: () => ({}),
      runSync: () => ({ body: [{ expression: 'x' }] }),
    };

    assert.equal(createChangeElement({ changes: [] }, remark), null);

    const el = createChangeElement(
      { changes: [{ version: 'v1.0.0', description: 'x' }] },
      remark
    );
    assert.equal(el.type, 'jsx');
    assert.equal(el.name, 'ChangeHistory');
    assert.ok(Array.isArray(el.props.changes));
  });

  it('creates source link element when provided', () => {
    assert.equal(createSourceLink(undefined), null);

    const node = createSourceLink('lib/fs.js');
    assert.equal(node.tagName, 'span');
    const anchor = node.children[1];
    assert.equal(anchor.tagName, 'a');
    assert.match(anchor.properties.href, /lib\/fs\.js$/);
  });

  it('extractHeadingContent prefers inferred full name', () => {
    const heading = {
      type: 'heading',
      children: ['fallback'],
      data: { name: 'X', text: 'something', type: 'ctor' },
    };

    assert.equal(extractHeadingContent(heading), 'Full.Name Constructor');
  });

  it('creates heading element with icon + change element', () => {
    const heading = {
      type: 'heading',
      children: [{ type: 'text', value: 'Hi' }],
      data: { type: 'method', depth: 2, slug: 's', name: 'X', text: 'X' },
    };

    const change = { type: 'jsx', name: 'ChangeHistory', props: {} };
    const out = createHeadingElement(heading, change);

    assert.equal(out.tagName, 'div');
    assert.equal(out.children[0].type, 'jsx');
    assert.equal(out.children[0].name, 'DataTag');
    assert.equal(out.children[out.children.length - 1], change);
  });

  it('transforms stability nodes into AlertBox', () => {
    const node = {
      type: 'blockquote',
      data: { index: '1.0' },
      children: [{ type: 'paragraph', children: [] }],
    };

    const parent = { children: [node] };
    const res = transformStabilityNode(node, 0, parent);

    assert.equal(parent.children[0].type, 'jsx');
    assert.equal(parent.children[0].name, 'AlertBox');
    assert.equal(Array.isArray(res), true);
  });

  it('transforms deprecations headings with type box, source link, and signature insertion', () => {
    const remark = {
      parse: () => ({}),
      runSync: () => ({ body: [{ expression: null }] }),
    };

    const heading = {
      type: 'heading',
      depth: 3,
      children: [],
      data: {
        type: 'method',
        slug: 'x',
        name: 'X',
        text: 'X',
      },
    };

    const typeNode = { type: 'paragraph', children: [] };
    const parent = { children: [heading, typeNode] };

    const entry = {
      api: 'deprecations',
      source_link: 'lib/deprecations.js',
      changes: [],
    };

    transformHeadingNode(entry, remark, heading, 0, parent);

    // Heading replaced with wrapper
    assert.equal(parent.children[0].tagName, 'div');

    // Source link inserted right after heading
    assert.equal(parent.children[1].tagName, 'span');

    // Type node replaced with AlertBox (shifted due to splice)
    const alert = parent.children[2];
    assert.equal(alert.type, 'jsx');
    assert.equal(alert.name, 'AlertBox');
    assert.equal(alert.props.title, 'Type');

    assert.equal(insertSignature.mock.callCount(), 1);
  });

  it('processEntry deep clones and transforms stability/heading/typed list nodes', () => {
    const entry = {
      api: 'fs',
      source_link: undefined,
      changes: [],
      content: {
        type: 'root',
        children: [
          {
            type: 'blockquote',
            data: { index: '2' },
            children: [{ type: 'paragraph', children: [] }],
          },
          {
            type: 'heading',
            children: [],
            data: { type: 'misc', depth: 2, slug: 'h', name: 'H', text: 'H' },
          },
          { type: 'list', data: { typed: true }, children: [] },
        ],
      },
    };

    const remark = {
      parse: () => ({}),
      runSync: () => ({ body: [{ expression: null }] }),
    };

    const out = processEntry(entry, remark);

    assert.equal(out.children[0].type, 'jsx');
    assert.equal(out.children[1].tagName, 'div');
    assert.equal(out.children[2].type, 'table');

    assert.equal(createPropertyTable.mock.callCount(), 1);
  });

  it('builds a document layout root', () => {
    const root = createDocumentLayout(
      [],
      { sidebar: true },
      { meta: true },
      {
        parse: () => ({}),
        runSync: () => ({ body: [{ expression: null }] }),
      }
    );

    assert.equal(root.type, 'root');
    assert.equal(root.children[0].type, 'jsx');
    assert.equal(root.children[0].name, 'NotificationProvider');
  });

  it('buildContent returns the program expression with head data', async () => {
    const remark = {
      parse: () => ({}),
      runSync: () => ({ body: [{ expression: null }] }),
      run: async () => ({
        body: [{ expression: { type: 'Expression', value: 1 } }],
      }),
    };

    const head = {
      api: 'fs',
      heading: { data: { name: 'fs' } },
      changes: [],
      source_link: undefined,
      content: { type: 'root', children: [] },
    };
    const res = await buildContent([head], head, { sidebar: true }, remark);

    assert.equal(res.type, 'Expression');
    assert.equal(res.data, head);
  });
});
