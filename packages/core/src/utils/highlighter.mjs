'use strict';

import { endianness } from 'node:os';

import createHighlighter from '@node-core/rehype-shiki';

export const highlighter = await createHighlighter({
  // riscv64 with sv39 has limited virtual memory space, where creating
  // too many (>20) wasm memory instances fails.
  // https://github.com/nodejs/node/pull/60591
  //
  // The wasm highlighter is currently not compatible with big endian.
  // https://github.com/nodejs/node/pull/62512#issuecomment-4243469950
  wasm: process.arch !== 'riscv64' && endianness() === 'LE',
});
