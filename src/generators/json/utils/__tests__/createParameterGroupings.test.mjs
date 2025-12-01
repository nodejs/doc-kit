'use strict';

import assert from 'node:assert';
import { describe, test } from 'node:test';

import { createParameterGroupings } from '../createParameterGroupings.mjs';

describe('createParameterGroupings', () => {
  test('param1, param2', () => {
    const groupings = createParameterGroupings('param1, param2'.split(','));

    assert.deepStrictEqual(groupings, [['param1', 'param2']]);
  });

  test('[param1]', () => {
    const groupings = createParameterGroupings('[param1]'.split(','));

    assert.deepStrictEqual(groupings, [[], ['param1']]);
  });

  test('[param1, param2]', () => {
    const groupings = createParameterGroupings('[param1, param2]'.split(','));

    assert.deepStrictEqual(groupings, [[], ['param1', 'param2']]);
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

  test('[param1][, param2[, param3]]', () => {
    const groupings = createParameterGroupings(
      '[param1][, param2[, param3]]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      [],
      ['param1'],
      ['param2'],
      ['param2', 'param3'],
    ]);
  });

  test('[param1][, param2]', () => {
    const groupings = createParameterGroupings('[param1][, param2]'.split(','));

    assert.deepStrictEqual(groupings, [[], ['param1'], ['param2']]);
  });

  test('[param1][, param2][, param3][, param4][, param5, param6]', () => {
    const groupings = createParameterGroupings(
      '[param1][, param2][, param3][, param4][, param5, param6]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      [],
      ['param1'],
      ['param2'],
      ['param3'],
      ['param4'],
      ['param5', 'param6'],
    ]);
  });

  test('[param1][, param2][, param3][, param4][, param5, param6[, param7[, param8]]]', () => {
    const groupings = createParameterGroupings(
      '[param1][, param2][, param3][, param4][, param5, param6[, param7[, param8]]]'.split(
        ','
      )
    );

    assert.deepStrictEqual(groupings, [
      [],
      ['param1'],
      ['param2'],
      ['param3'],
      ['param4'],
      ['param5', 'param6'],
      ['param5', 'param6', 'param7'],
      ['param5', 'param6', 'param7', 'param8'],
    ]);
  });

  test('value[, offset[, end]][, encoding]', () => {
    const groupings = createParameterGroupings(
      'value[, offset[, end]][, encoding]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['value'],
      ['value', 'offset'],
      ['value', 'offset', 'end'],
      ['value', 'encoding'],
    ]);
  });

  test('[min, ]max[, callback]', () => {
    const groupings = createParameterGroupings(
      '[min, ]max[, callback]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['max'],
      ['min', 'max'],
      ['max', 'callback'],
      ['min', 'max', 'callback'],
    ]);
  });

  test('onsession,[options]', () => {
    const groupings = createParameterGroupings(
      'onsession,[options]'.split(',')
    );

    assert.deepStrictEqual(groupings, [
      ['onsession'],
      ['onsession', 'options'],
    ]);
  });
});
