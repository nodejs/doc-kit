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

    const error = new Error('Hello, World!');
    logger.error(error);

    strictEqual(transport.mock.callCount(), 1);

    const call = transport.mock.calls[0];
    deepStrictEqual(call.arguments, [
      {
        level: LogLevel.error,
        message: 'Hello, World!',
        metadata: {
          stack: error.stack,
        },
        module: undefined,
        timestamp: 0,
      },
    ]);
  });

  describe('setLogLevel', () => {
    it('should change log level at runtime using number', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.info);

      // Should log at info level
      logger.info('Info message');
      strictEqual(transport.mock.callCount(), 1);

      // Change to error level
      logger.setLogLevel(LogLevel.error);

      // Should not log info anymore
      logger.info('Another info message');
      strictEqual(transport.mock.callCount(), 1);

      // Should log error
      logger.error('Error message');
      strictEqual(transport.mock.callCount(), 2);
    });

    it('should change log level at runtime using string', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.error);

      // Should not log at info level initially
      logger.info('Info message');
      strictEqual(transport.mock.callCount(), 0);

      // Change to debug level using string
      logger.setLogLevel('debug');

      // Should now log info
      logger.info('Another info message');
      strictEqual(transport.mock.callCount(), 1);
    });

    it('should handle case-insensitive level names', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.fatal);

      logger.setLogLevel('DEBUG');
      logger.debug('Debug message');
      strictEqual(transport.mock.callCount(), 1);

      logger.setLogLevel('Info');
      logger.debug('Debug message 2');
      strictEqual(transport.mock.callCount(), 1); // Should not log debug at info level
    });

    it('should propagate to child loggers', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.info);
      const child = logger.child('child-module');

      // Child should initially respect parent's info level
      child.debug('Debug message');
      strictEqual(transport.mock.callCount(), 0);

      child.info('Info message');
      strictEqual(transport.mock.callCount(), 1);

      // Change parent to debug level
      logger.setLogLevel(LogLevel.debug);

      // Child should now log debug messages
      child.debug('Debug message after level change');
      strictEqual(transport.mock.callCount(), 2);

      // Change parent to error level
      logger.setLogLevel(LogLevel.error);

      // Child should not log info anymore
      child.info('Info message after error level');
      strictEqual(transport.mock.callCount(), 2);

      // Child should log error
      child.error('Error message');
      strictEqual(transport.mock.callCount(), 3);
    });

    it('should propagate to nested child loggers', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.error);
      const child1 = logger.child('child1');
      const child2 = child1.child('child2');
      const child3 = child2.child('child3');

      // None should log debug initially
      logger.debug('root debug');
      child1.debug('child1 debug');
      child2.debug('child2 debug');
      child3.debug('child3 debug');
      strictEqual(transport.mock.callCount(), 0);

      // Change root to debug level
      logger.setLogLevel(LogLevel.debug);

      // All should now log debug
      child1.debug('child1 debug after');
      strictEqual(transport.mock.callCount(), 1);

      child2.debug('child2 debug after');
      strictEqual(transport.mock.callCount(), 2);

      child3.debug('child3 debug after');
      strictEqual(transport.mock.callCount(), 3);
    });

    it('should propagate to multiple children at same level', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.error);
      const childA = logger.child('childA');
      const childB = logger.child('childB');
      const childC = logger.child('childC');

      // None should log info
      childA.info('A info');
      childB.info('B info');
      childC.info('C info');
      strictEqual(transport.mock.callCount(), 0);

      // Change root to info
      logger.setLogLevel(LogLevel.info);

      // All children should now log info
      childA.info('A info after');
      strictEqual(transport.mock.callCount(), 1);

      childB.info('B info after');
      strictEqual(transport.mock.callCount(), 2);

      childC.info('C info after');
      strictEqual(transport.mock.callCount(), 3);
    });

    it('should ignore invalid string level names', t => {
      const transport = t.mock.fn();

      const logger = createLogger(transport, LogLevel.info);

      // Try to set invalid level
      logger.setLogLevel('invalid');

      // Should still log at info level
      logger.info('Info message');
      strictEqual(transport.mock.callCount(), 1);

      logger.debug('Debug message');
      strictEqual(transport.mock.callCount(), 1); // Debug should be filtered
    });
  });
});
