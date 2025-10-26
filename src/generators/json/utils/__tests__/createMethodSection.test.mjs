// @ts-check
'use strict';

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { createParameterGroupings } from '../createMethodSection.mjs';

describe('createParameterGroupings', () => {
  test('param1, param2', () => {
    const groupings = createParameterGroupings('param1, param2'.split(','));

    assert.deepStrictEqual(groupings, [['param1', 'param2']]);
  });

  test('[param1]', () => {
    const groupings = createParameterGroupings('[param1]'.split(','));

    assert.deepStrictEqual(groupings, [[], ['param1']]);
  });

  test('param1[, param2]', () => {
    const groupings = createParameterGroupings('param1[, param2]'.split(','));

    assert.deepStrictEqual(groupings, [['param1'], ['param1', 'param2']]);
  });

  test('param1[, param2, param3]', () => {
    const groupings = createParameterGroupings(
      'param1[, param2, param3]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['param1'],
      ['param1', 'param2', 'param3'],
    ]);
  });

  test('param1[, param2], param3', () => {
    const groupings = createParameterGroupings(
      'param1[, param2], param3'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['param1', 'param3'],
      ['param1', 'param2', 'param3'],
    ]);
  });

  test('param1[, param2[, param3]]', () => {
    const groupings = createParameterGroupings(
      'param1[, param2[, param3]]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['param1'],
      ['param1', 'param2'],
      ['param1', 'param2', 'param3'],
    ]);
  });
});
