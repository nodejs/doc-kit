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
    assert.equal(result[0].value, 'fs.readFile()');
    assert.equal(result[0].depth, 2);
    assert.equal(result[0].stability, 2);
    assert.equal(result[1].stability, 2);
  });

  it('keeps method table of contents labels compact', () => {
    const entries = [
      {
        heading: {
          depth: 3,
          data: {
            text: '`crypto.createHash(algorithm[, options])`',
            name: 'createHash',
            slug: 'crypto-createhash',
            type: 'method',
          },
        },
      },
    ];

    const [result] = extractHeadings(entries);

    assert.equal(result.value, 'crypto.createHash()');
  });

  it('keeps full method labels when compact labels would collide', () => {
    const entries = [
      {
        heading: {
          depth: 3,
          data: {
            text: '`url.format(urlObject)`',
            name: 'format',
            slug: 'url-format-urlobject',
            type: 'method',
          },
        },
      },
      {
        heading: {
          depth: 3,
          data: {
            text: '`url.format(urlString)`',
            name: 'format',
            slug: 'url-format-urlstring',
            type: 'method',
          },
        },
      },
      {
        heading: {
          depth: 3,
          data: {
            text: '`url.parse(urlString)`',
            name: 'parse',
            slug: 'url-parse-urlstring',
            type: 'method',
          },
        },
      },
    ];

    const result = extractHeadings(entries);

    assert.equal(result[0].value, 'url.format(urlObject)');
    assert.equal(result[1].value, 'url.format(urlString)');
    assert.equal(result[2].value, 'url.parse()');
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
});
