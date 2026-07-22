'use strict';

// TODO(@avivkeller): Once oxc-parser supports WASM, or the
// bindings we need, remove this in favor of it. It's much
// faster.
//
// For now, however, this is our walker :-)

/**
 * @param {unknown} node
 * @param {((node: { type: string }) => void) | Record<string, (node: never) => void>} visitors
 */
export const walk = (node, visitors) => {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach(child => walk(child, visitors));
    return;
  }

  if (typeof visitors === 'function') {
    visitors(node);
  } else {
    visitors[node.type]?.(node);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key !== 'span' && key !== 'loc') {
      walk(value, visitors);
    }
  }
};
