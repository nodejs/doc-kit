import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { transformNodesToString, callIfBefore } from '../unist.mjs';

describe('transformNodesToString', () => {
  it('should transform a list of Nodes into a string', () => {
    const nodes = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'Hello, ',
          },
          {
            type: 'strong',
            children: [
              {
                type: 'text',
                value: 'World',
              },
            ],
          },
        ],
      },
    ];
    strictEqual(transformNodesToString(nodes), 'Hello, **World**');
  });
});

describe('callIfBefore', () => {
  it('should call the callback if the first Node is before the second Node', () => {
    const nodeA = {
      position: {
        start: {
          line: 1,
        },
      },
    };
    const nodeB = {
      position: {
        start: {
          line: 2,
        },
      },
    };
    callIfBefore(nodeA, nodeB, (nodeA, nodeB) => {
      strictEqual(nodeA.position.start.line < nodeB.position.start.line, true);
    });
  });

  it('should not call the callback if the first Node is not before the second Node', () => {
    const nodeA = {
      position: {
        start: {
          line: 2,
        },
      },
    };
    const nodeB = {
      position: {
        start: {
          line: 1,
        },
      },
    };
    callIfBefore(nodeA, nodeB, (nodeA, nodeB) => {
      strictEqual(nodeA.position.start.line < nodeB.position.start.line, true);
    });
  });
});
