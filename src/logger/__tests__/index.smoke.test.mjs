import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import logger, { Logger } from '../index.mjs';

describe('logger index (smoke)', () => {
  it('exports a default logger instance', () => {
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.error, 'function');
    assert.equal(typeof logger.setLogLevel, 'function');
  });

  it('can create a console logger via Logger()', () => {
    const consoleLogger = Logger('console');
    assert.equal(typeof consoleLogger.info, 'function');
    assert.equal(typeof consoleLogger.setLogLevel, 'function');
  });
});
