import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitIntoChunks } from '../utils/split.mjs';

const entry = (depth, text, type) => ({
  heading: { depth, data: { text, name: text, slug: text, type } },
});

const names = chunk => chunk.entries.map(e => e.heading.data.text);

describe('splitIntoChunks', () => {
  it('starts a chunk at every depth-2 heading and drops the module intro', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'a()', 'method'),
        entry(2, 'b()', 'method'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [['a()'], ['b()']]);
    assert.deepEqual(
      chunks.map(c => c.depth),
      [2, 2]
    );
  });

  it('starts a chunk at API-typed headings, but keeps prose sub-sections', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Callback API'),
        entry(3, 'fs.readFile()', 'method'),
        entry(4, 'File descriptors'),
        entry(3, 'Caveats'),
        entry(3, "Event: 'close'", 'event'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [
      ['Callback API'],
      ['fs.readFile()', 'File descriptors', 'Caveats'],
      ["Event: 'close'"],
    ]);
  });

  it('never starts a chunk beyond maxDepth', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Section'),
        entry(3, 'a()', 'method'),
        entry(4, 'b()', 'method'),
      ],
      2
    );

    assert.deepEqual(chunks.map(names), [['Section', 'a()', 'b()']]);
  });

  it('keeps a class together with its members', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Class: net.Server', 'class'),
        entry(3, 'new net.Server()', 'ctor'),
        entry(3, "Event: 'close'", 'event'),
        entry(3, 'server.listen()', 'method'),
        entry(2, 'net.connect()', 'method'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [
      [
        'Class: net.Server',
        'new net.Server()',
        "Event: 'close'",
        'server.listen()',
      ],
      ['net.connect()'],
    ]);
  });

  it('closes a class chunk at the next heading of the same depth or above', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Promises API'),
        entry(3, 'Class: FileHandle', 'class'),
        entry(4, 'filehandle.read()', 'method'),
        entry(3, 'fsPromises.access()', 'method'),
        entry(2, 'Callback API'),
        entry(3, 'fs.access()', 'method'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [
      ['Promises API'],
      ['Class: FileHandle', 'filehandle.read()'],
      ['fsPromises.access()'],
      ['Callback API'],
      ['fs.access()'],
    ]);
  });

  it('leaves content before the first chunk to the full page', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(4, 'Stray'),
        entry(2, 'Section'),
        entry(3, 'a()', 'method'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [['Section'], ['a()']]);
  });

  it('leaves sections that document no API entry to the full page', () => {
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Introduction'),
        entry(3, 'Terminology'),
        entry(2, 'Class: AsyncLocalStorage', 'class'),
        entry(3, 'new AsyncLocalStorage()', 'ctor'),
        entry(2, 'Notes'),
        entry(3, 'Threadpool usage'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [
      ['Class: AsyncLocalStorage', 'new AsyncLocalStorage()'],
    ]);
  });

  it('keeps a prose-headed section whose sub-sections document API entries', () => {
    // Even when those sub-sections get chunks of their own: the section page
    // then carries the introduction, and the sidebar nests the rest under it.
    const chunks = splitIntoChunks(
      [
        entry(1, 'Module'),
        entry(2, 'Callback API'),
        entry(3, 'fs.readFile()', 'method'),
        entry(2, 'Exit codes'),
        entry(3, '1 Uncaught Fatal Exception'),
      ],
      3
    );

    assert.deepEqual(chunks.map(names), [['Callback API'], ['fs.readFile()']]);
  });
});
