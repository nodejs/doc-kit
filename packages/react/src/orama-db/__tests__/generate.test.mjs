import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { create, load, search } from '@orama/orama';
import { u } from 'unist-builder';

import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['orama-db'] });

// Return the saved index instead of writing it to disk
config['orama-db'].output = undefined;

const entry = (api, path, depth, name, slug, text) => ({
  api,
  path,
  heading: { depth, data: { name, slug } },
  content: u('root', [u('paragraph', [u('text', text)])]),
});

const fs = [
  entry('fs', '/fs', 1, 'File system', 'file-system', 'Files.'),
  entry('fs', '/fs', 2, 'Class: FileHandle', 'class-filehandle', 'A handle.'),
  entry('fs', '/fs', 3, 'readFile', 'readfile', 'Reads a file.'),
];

const http = [
  entry('http', '/http', 1, 'HTTP', 'http', 'Requests.'),
  entry('http', '/http', 2, 'request', 'request', 'Sends a request.'),
];

describe('orama-db', () => {
  it('produces the same output on every run', async () => {
    const first = await generate([...fs, ...http]);
    const second = await generate([...fs, ...http]);

    assert.equal(JSON.stringify(first), JSON.stringify(second));
  });

  it('produces the same output whatever order the modules arrive in', async () => {
    const forward = await generate([...fs, ...http]);
    const reversed = await generate([...http, ...fs]);

    assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
  });

  it('keeps each module hierarchical title', async () => {
    const db = create({ schema: {} });
    load(db, await generate([...http, ...fs]));

    const { hits } = await search(db, { term: 'readFile' });

    assert.equal(hits[0].document.title, 'Class: FileHandle > readFile');
  });

  it('can still be searched', async () => {
    const db = create({ schema: {} });
    load(db, await generate([...fs, ...http]));

    const { hits } = await search(db, { term: 'request' });

    assert.equal(hits[0].document.href, '/http.html#request');
  });
});
