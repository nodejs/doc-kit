import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildHierarchicalTitle } from '../title.mjs';

describe('buildHierarchicalTitle', () => {
  const mockHeadings = [
    { heading: { data: { name: 'Module' }, depth: 1 } },
    { heading: { data: { name: 'Class' }, depth: 2 } },
    { heading: { data: { name: 'Method' }, depth: 3 } },
    { heading: { data: { name: 'Parameter' }, depth: 4 } },
  ];

  it('should build single level title', () => {
    const result = buildHierarchicalTitle(mockHeadings, 0);
    assert.equal(result, 'Module');
  });

  it('should build two level hierarchy', () => {
    const result = buildHierarchicalTitle(mockHeadings, 1);
    assert.equal(result, 'Class');
  });

  it('should build three level hierarchy', () => {
    const result = buildHierarchicalTitle(mockHeadings, 2);
    assert.equal(result, 'Class > Method');
  });

  it('should build full hierarchy', () => {
    const result = buildHierarchicalTitle(mockHeadings, 3);
    assert.equal(result, 'Class > Method > Parameter');
  });

  it('should handle non-sequential depths', () => {
    const headings = [
      { heading: { data: { name: 'Root' }, depth: 1 } },
      { heading: { data: { name: 'Deep' }, depth: 4 } },
    ];

    const result = buildHierarchicalTitle(headings, 1);
    assert.equal(result, 'Deep');
  });

  it('should handle same depth headings', () => {
    const headings = [
      { heading: { data: { name: 'First' }, depth: 2 } },
      { heading: { data: { name: 'Second' }, depth: 2 } },
    ];

    const result = buildHierarchicalTitle(headings, 1);
    assert.equal(result, 'Second');
  });
});
