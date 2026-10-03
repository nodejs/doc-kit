import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { UnknownType } from 'typedoc';

import { renderType } from '../types.mjs';

describe('renderType', () => {
  it('renders the parts TypeDoc stopped converting as unknown', () => {
    strictEqual(renderType(new UnknownType('...')), 'unknown');
    strictEqual(
      renderType(new UnknownType('Promise<...> | null')),
      'Promise<unknown> | null'
    );
  });

  it('keeps string literal types', () => {
    const type = '"..." | "a ... b" | RuleSetRule';

    strictEqual(renderType(new UnknownType(type)), type);
  });

  it('keeps rest parameters and spreads', () => {
    const type = '(...args: [...Rest, number]) => void';

    strictEqual(renderType(new UnknownType(type)), type);
  });

  it('renders a missing type as unknown', () => {
    strictEqual(renderType(undefined), 'unknown');
  });
});
