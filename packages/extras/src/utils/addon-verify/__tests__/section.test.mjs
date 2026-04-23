import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isBuildableSection,
  normalizeSectionName,
  generateSectionFolderName,
} from '../section.mjs';

describe('isBuildableSection', () => {
  it('should return true when both .cc and .js files are present', () => {
    const codeBlocks = [
      { name: 'addon.cc', content: 'C++ code' },
      { name: 'test.js', content: 'JS code' },
    ];

    assert.equal(isBuildableSection(codeBlocks), true);
  });

  it('should return false when only .cc file is present', () => {
    const codeBlocks = [{ name: 'addon.cc', content: 'C++ code' }];

    assert.equal(isBuildableSection(codeBlocks), false);
  });

  it('should return false when only .js file is present', () => {
    const codeBlocks = [{ name: 'test.js', content: 'JS code' }];

    assert.equal(isBuildableSection(codeBlocks), false);
  });

  it('should return false for empty array', () => {
    assert.equal(isBuildableSection([]), false);
  });
});

describe('normalizeSectionName', () => {
  it('should convert to lowercase and replace spaces with underscores', () => {
    assert.equal(normalizeSectionName('Hello World'), 'hello_world');
  });

  it('should remove non-word characters', () => {
    assert.equal(normalizeSectionName('Test-Section!@#'), 'testsection');
  });

  it('should handle empty string', () => {
    assert.equal(normalizeSectionName(''), '');
  });

  it('should handle mixed cases and special characters', () => {
    assert.equal(
      normalizeSectionName('My Test & Example #1'),
      'my_test__example_1'
    );
  });
});

describe('generateSectionFolderName', () => {
  it('should generate folder name with padded index', () => {
    assert.equal(generateSectionFolderName('hello_world', 0), '01_hello_world');
  });

  it('should pad single digit indices', () => {
    assert.equal(generateSectionFolderName('test', 5), '06_test');
  });

  it('should not pad double digit indices', () => {
    assert.equal(generateSectionFolderName('example', 15), '16_example');
  });

  it('should handle empty section name', () => {
    assert.equal(generateSectionFolderName('', 0), '01_');
  });
});
