import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { LogLevel } from '../constants.mjs';
import { createLogger } from '../logger.mjs';

/**
 * @type {import('../types').Metadata}
 */
const metadata = {
  file: {
    path: 'test.md',
    position: {
      start: { line: 1 },
      end: { line: 1 },
    },
  },
};

describe('createLogger', () => {
  describe('DEBUG', () => {
    it('should log DEBUG messages when logger level is set to DEBUG', t => {
      t.mock.timers.enable({ apis: ['Date'] });

      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.debug);

      logger.debug('Hello, World!', metadata);

      strictEqual(transport.mock.callCount(), 1);

      const call = transport.mock.calls[0];
      deepStrictEqual(call.arguments, [
        {
          level: LogLevel.debug,
          message: 'Hello, World!',
          metadata,
          module: undefined,
          timestamp: 0,
        },
      ]);
    });

    it('should filter DEBUG messages when logger level is set to INFO or higher', t => {
      [LogLevel.info, LogLevel.warn, LogLevel.error, LogLevel.fatal].forEach(
        loggerLevel => {
          const transport = t.mock.fn();

          const logger = createLogger(transport, loggerLevel);

          logger.debug('Hello, World!');

          strictEqual(transport.mock.callCount(), 0);
        }
      );
    });
  });

  describe('INFO', () => {
    it('should log INFO messages when logger level is set to INFO or lower', t => {
      t.mock.timers.enable({ apis: ['Date'] });
      [LogLevel.info, LogLevel.debug].forEach(loggerLevel => {
        const transport = t.mock.fn();

        const logger = createLogger(transport, loggerLevel);

        logger.info('Hello, World!', metadata);

        strictEqual(transport.mock.callCount(), 1);

        const call = transport.mock.calls[0];
        deepStrictEqual(call.arguments, [
          {
            level: LogLevel.info,
            message: 'Hello, World!',
            metadata,
            module: undefined,
            timestamp: 0,
          },
        ]);
      });
    });

    it('should filter INFO messages when logger level is set to WARN or higher', t => {
      [LogLevel.warn, LogLevel.error, LogLevel.fatal].forEach(loggerLevel => {
        const transport = t.mock.fn();

        const logger = createLogger(transport, loggerLevel);

        logger.info('Hello, World!');

        strictEqual(transport.mock.callCount(), 0);
      });
    });
  });

  describe('WARN', () => {
    it('should log WARN messages when logger level is set to WARN or lower', t => {
      t.mock.timers.enable({ apis: ['Date'] });

      [LogLevel.warn, LogLevel.info, LogLevel.debug].forEach(loggerLevel => {
        const transport = t.mock.fn();

        const logger = createLogger(transport, loggerLevel);

        logger.warn('Hello, World!', metadata);

        strictEqual(transport.mock.callCount(), 1);

        const call = transport.mock.calls[0];
        deepStrictEqual(call.arguments, [
          {
            level: LogLevel.warn,
            message: 'Hello, World!',
            metadata,
            module: undefined,
            timestamp: 0,
          },
        ]);
      });
    });

    it('should filter WARN messages when logger level is set to ERROR or higher', t => {
      [LogLevel.error, LogLevel.fatal].forEach(loggerLevel => {
        const transport = t.mock.fn();

        const logger = createLogger(transport, loggerLevel);

        logger.warn('Hello, World!');

        strictEqual(transport.mock.callCount(), 0);
      });
    });
  });

  describe('ERROR', () => {
    it('should log ERROR messages when logger level is set to ERROR or lower', t => {
      t.mock.timers.enable({ apis: ['Date'] });

      [LogLevel.error, LogLevel.warn, LogLevel.info, LogLevel.debug].forEach(
        loggerLevel => {
          const transport = t.mock.fn();

          const logger = createLogger(transport, loggerLevel);

          logger.error('Hello, World!', metadata);

          strictEqual(transport.mock.callCount(), 1);

          const call = transport.mock.calls[0];
          deepStrictEqual(call.arguments, [
            {
              level: LogLevel.error,
              message: 'Hello, World!',
              metadata,
              module: undefined,
              timestamp: 0,
            },
          ]);
        }
      );
    });

    it('should filter ERROR messages when logger level is set to FATAL', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.fatal);

      logger.warn('Hello, World!');

      strictEqual(transport.mock.callCount(), 0);
    });
  });

  it('should filter all messages when minimum level is set above FATAL', t => {
    const transport = t.mock.fn();

    // silent logs
    const logger = createLogger(transport, 100);

    Object.keys(LogLevel).forEach(level => {
      logger[level]('Hello, World!');
    });

    strictEqual(transport.mock.callCount(), 0);
  });

  it('should log all messages if message is a string array', t => {
    const transport = t.mock.fn();

    const logger = createLogger(transport, LogLevel.info);

    logger.info(['Hello, 1!', 'Hello, 2!', 'Hello, 3!']);

    strictEqual(transport.mock.callCount(), 3);
  });

  it('should log error message', t => {
    t.mock.timers.enable({ apis: ['Date'] });

    const transport = t.mock.fn();

    const logger = createLogger(transport, LogLevel.error);

    logger.error(new Error('Hello, World!'));

    strictEqual(transport.mock.callCount(), 1);

    const call = transport.mock.calls[0];
    deepStrictEqual(call.arguments, [
      {
        level: LogLevel.error,
        message: 'Hello, World!',
        metadata: {},
        module: undefined,
        timestamp: 0,
      },
    ]);
  });
});
