import { ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { Logger } from '../index.mjs';

describe('Logger singleton', () => {
  it('should return the same instance on multiple calls', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();

    strictEqual(logger1, logger2);
  });

  it('should create an instance of logger', () => {
    const logger = Logger.getInstance();

    ok(logger);
  });
});
