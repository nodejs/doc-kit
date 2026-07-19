import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { extractTextContent, extractHeadings } =
  await import('../buildBarProps.mjs');

describe('extractTextContent', () => {
  it('combines text and code node values from entries', () => {
    const entries = [
      {
        content: {
          type: 'root',
          children: [
            { type: 'text', value: 'Hello ' },
            { type: 'code', value: 'world' },
          ],
        },
      },
      {
        content: {
          type: 'root',
          children: [
            { type: 'text', value: 'Another ' },
            { type: 'code', value: 'example' },
          ],
        },
      },
    ];

    const result = extractTextContent(entries);
    assert.equal(result, 'Hello worldAnother example');
  });
});

describe('extractHeadings', () => {
  it('extracts headings from entries that qualify for ToC', () => {
    const entries = [
      {
        heading: {
          depth: 2,
          data: {
            text: 'fs.readFile(path)',
            name: 'readFile',
            slug: 'fs-readfile',
            type: 'method',
          },
        },
        stability: { data: { index: '2' } },
      },
      {
        heading: {
          depth: 2,
          data: {
            text: 'fs.writeFile(path)',
            name: 'writeFile',
            slug: 'fs-writefile',
            type: 'method',
          },
        },
        stability: null,
      },
    ];

    const result = extractHeadings(entries);

    assert.equal(result.length, 2);
    assert.equal(result[0].slug, 'fs-readfile');
    assert.equal(result[0].depth, 2);
    assert.equal(result[0].stability, 2);
    assert.equal(result[1].stability, 2);
  });

  it('filters out entries with empty heading text', () => {
    const entries = [
      {
        heading: {
          depth: 2,
          data: { text: '', name: '', slug: '', type: 'method' },
        },
      },
    ];

    const result = extractHeadings(entries);
    assert.equal(result.length, 0);
  });

  it('labels callables with the bare name instead of the full signature', () => {
    const entries = [
      {
        heading: {
          depth: 2,
          data: {
            text: 'fs.read(fd, buffer, offset, length, position, callback)',
            name: 'fs.read',
            slug: 'fsreadfd',
            type: 'method',
          },
        },
      },
      {
        heading: {
          depth: 2,
          data: {
            text: 'new Buffer(size)',
            name: 'Buffer',
            slug: 'new-buffersize',
            type: 'ctor',
          },
        },
      },
    ];

    const result = extractHeadings(entries);

    assert.equal(result[0].value, 'fs.read');
    assert.equal(result[1].value, 'new Buffer');
  });

  it('preserves deprecation codes in heading labels', () => {
    const entries = [
      {
        heading: {
          depth: 2,
          data: {
            text: 'DEP0001: `http.OutgoingMessage.prototype.flush`',
            name: 'http.OutgoingMessage.prototype.flush',
            slug: 'DEP0001',
          },
        },
      },
    ];

    const result = extractHeadings(entries);

    assert.equal(
      result[0].value,
      'DEP0001: http.OutgoingMessage.prototype.flush'
    );
  });

  it('drops overload headings and links to the first signature', () => {
    const entries = [
      {
        heading: {
          depth: 2,
          data: {
            text: 'fs.read(fd)',
            name: 'fs.read',
            slug: 'fsreadfd',
            type: 'method',
          },
        },
      },
      {
        heading: {
          depth: 2,
          data: {
            text: 'fs.read(fd, options)',
            name: 'fs.read',
            slug: 'fsreadoptions',
            type: 'method',
            isOverload: true,
          },
        },
      },
    ];

    const result = extractHeadings(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].slug, 'fsreadfd');
    assert.equal(result[0].data.id, 'fsreadfd');
    assert.equal(result[0].value, 'fs.read');
  });
});
