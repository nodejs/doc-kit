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
});
