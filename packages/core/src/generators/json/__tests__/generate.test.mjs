import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import { globSync } from 'tinyglobby';

import { parseApiDoc } from '#generators/metadata/utils/parse.mjs';
import { QUERIES } from '#utils/queries/index.mjs';
import { getRemark } from '#utils/remark.mjs';

import schema from '../schema.json' with { type: 'json' };
import { buildDocument } from '../utils/document.mjs';

const fixtures = new URL('./fixtures/', import.meta.url);

const typeMap = {
  EventEmitter: 'events.html#class-eventemitter',
  Widget: 'widgets.html#class-widgetswidget',
};

const dependencies = {
  schemaURL: 'https://example.com/api-doc.json',
  sourceURL: 'https://github.com/example/widgets/blob/HEAD/',
};

const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);

/**
 * Runs a fixture through the metadata stage and builds its document.
 */
const buildFixture = async name => {
  const content = await readFile(new URL(name, fixtures), 'utf-8');

  // The AST stage links the stability prefix; mirror that
  const source = content.replace(
    QUERIES.stabilityIndexPrefix,
    match => `[${match}](documentation.html#stability-index)`
  );

  const path = `/${basename(name, '.md')}`;
  const entries = parseApiDoc(
    { path, tree: getRemark().parse(source) },
    typeMap
  );

  return buildDocument(entries[0], entries, dependencies);
};

/**
 * Finds the first node of a document matching a predicate.
 */
const find = ({ children }, predicate) => {
  for (const node of children) {
    const found = predicate(node) ? node : find(node, predicate);

    if (found) {
      return found;
    }
  }

  return undefined;
};

describe('json', () => {
  for (const name of globSync('*.md', { cwd: fileURLToPath(fixtures) })) {
    it(`builds a valid document for ${name}`, async t => {
      const document = await buildFixture(name);

      assert.ok(validate(document), JSON.stringify(validate.errors, null, 2));

      t.assert.snapshot(document);
    });
  }

  describe('a module document', async () => {
    const document = await buildFixture('module.md');

    it('takes the document-level directives', () => {
      assert.equal(document.id, 'module');
      assert.equal(document.type, 'module');
      assert.equal(document.module, 'widgets');
      assert.equal(document.introducedIn, 'v1.0.0');
      assert.deepEqual(document.sourceLink, {
        path: 'lib/widgets.js',
        url: 'https://github.com/example/widgets/blob/HEAD/lib/widgets.js',
      });
      assert.deepEqual(document.stability, {
        index: '2',
        level: 2,
        description: 'Stable',
      });
    });

    it('keeps prose as Markdown, with references resolved and types kept', () => {
      assert.match(
        document.description,
        /\{Widget\} objects\. See \[`widgets\.create\(\)`\]\(#widgetscreate\)/
      );
      assert.equal(
        document.summary,
        'The `node:widgets` module makes {Widget} objects. See `widgets.create()`.'
      );
      assert.deepEqual(document.examples, [
        {
          language: 'js',
          displayName: 'Making a widget',
          code: "const { create } = require('node:widgets');",
        },
      ]);
    });

    it('nests the headings by depth, in document order', () => {
      assert.deepEqual(
        document.children.map(({ kind, name }) => `${kind}:${name}`),
        ['class:Widget', 'section:Notes']
      );
      assert.deepEqual(
        document.children[0].children.map(
          ({ kind, name }) => `${kind}:${name}`
        ),
        [
          'constructor:Widget',
          'constructor:Widget',
          'event:ready',
          'method:render',
          'property:size',
          'staticMethod:from',
        ]
      );
    });

    it('lifts the extends clause out of a class', () => {
      const widget = find(document, ({ kind }) => kind === 'class');

      assert.deepEqual(widget.extends, {
        text: 'EventEmitter',
        links: [
          {
            name: 'EventEmitter',
            href: 'events.html#class-eventemitter',
            start: 0,
            end: 12,
          },
        ],
      });
      assert.equal(widget.description, 'A widget.');
      assert.deepEqual(widget.changes, [
        {
          versions: ['v2.0.0'],
          prUrl: 'https://github.com/example/widgets/pull/2',
          commit: null,
          description: "Widgets now emit `'ready'`.",
        },
      ]);
    });

    it('merges the heading and the typed list into a signature', () => {
      const [first, second] = document.children[0].children;

      assert.deepEqual(first.added, ['v1.0.0', 'v0.9.0']);
      assert.equal(first.overloadOf, null);
      assert.equal(second.overloadOf, first.id);

      const [name, options] = first.signature.parameters;

      assert.equal(name.name, 'name');
      assert.equal(name.type.text, 'string');
      assert.equal(name.description, "The widget's name.");
      assert.equal(name.optional, false);

      assert.equal(options.optional, true);
      assert.equal(options.description, '');
      assert.deepEqual(
        options.properties.map(({ name, default: value, optional }) => [
          name,
          value,
          optional,
        ]),
        [
          ['size', '1', true],
          ['signal', null, false],
        ]
      );
      assert.equal(options.properties[0].description, 'The size.');
      assert.equal(first.signature.returns, null);
    });

    it('handles rest parameters and return values', () => {
      const render = find(document, ({ name }) => name === 'render');
      const [targets] = render.signature.parameters;

      assert.deepEqual(
        [targets.name, targets.rest, targets.optional, targets.type.text],
        ['targets', true, true, 'string[]']
      );
      assert.deepEqual(render.signature.returns, {
        type: { text: 'Promise', links: render.signature.returns.type.links },
        description: 'Fulfills once rendered.',
      });
      assert.equal(
        render.description,
        'Renders the widget.\n\n```mjs\nawait widget.render();\n```'
      );
      assert.equal(render.examples.length, 1);
    });

    it('takes a property type, default and description from its list', () => {
      const size = find(document, ({ kind }) => kind === 'property');

      assert.equal(size.type.text, 'number');
      assert.equal(size.default, '1');
      assert.equal(size.description, "The widget's size.");
      assert.deepEqual(size.deprecated, ['v2.0.0']);
      assert.deepEqual(size.stability, {
        index: '0',
        level: 0,
        description:
          'Deprecated: Use [`widget.render()`](#widgetrendertargets) instead.',
      });
    });

    it('takes event parameters from the list', () => {
      const ready = find(document, ({ kind }) => kind === 'event');

      assert.equal(ready.parameters.length, 1);
      assert.equal(ready.parameters[0].name, 'widget');
      assert.equal(
        ready.parameters[0].type.links[0].href,
        'widgets.html#class-widgetswidget'
      );
      assert.equal(ready.description, 'Emitted once the widget is ready.');
    });

    it('leaves the lists of a section in its prose', () => {
      const notes = find(document, ({ name }) => name === 'Notes');

      assert.match(notes.description, /\* One thing\n\* Another thing/);
    });

    it('scopes an entry typed global without losing its kind', () => {
      const widget = find(document, ({ name }) => name === 'widget');

      assert.equal(widget.kind, 'property');
      assert.equal(widget.scope, 'global');
      assert.equal(widget.type.text, 'Widget');
    });
  });

  describe('a misc document', async () => {
    const document = await buildFixture('misc.md');

    it('is typed misc and has no module', () => {
      assert.equal(document.type, 'misc');
      assert.equal(document.module, null);
      assert.equal(document.sourceLink, null);
    });

    it('still classifies its headings, and keeps a second title as a section', () => {
      assert.deepEqual(
        document.children.map(({ kind, name }) => `${kind}:${name}`),
        ['class:Thing', 'section:Setup', 'section:Appendix']
      );
    });

    it('keeps a typed list under a section as prose', () => {
      const setup = find(document, ({ name }) => name === 'Setup');

      assert.match(
        setup.description,
        /^Type: Documentation-only\n\n\* `first` \{string\}/
      );
    });
  });
});
