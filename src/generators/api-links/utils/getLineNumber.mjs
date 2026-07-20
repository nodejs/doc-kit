'use strict';

const programOffsetsCache = new WeakMap();

/**
 *
 */
export function getLineNumber(code = '', offset = 0, program) {
  if (!code || offset <= 0) {
    return 1;
  }

  let offsets;

  if (program && typeof program === 'object') {
    offsets = programOffsetsCache.get(program);
    if (!offsets) {
      offsets = [0];
      const len = code.length;
      for (let i = 0; i < len; i++) {
        // 10 is the char code for '\n'. Faster than string comparison.
        if (code.charCodeAt(i) === 10) {
          offsets.push(i + 1);
        }
      }
      programOffsetsCache.set(program, offsets);
    }
  } else {
    // Fallback if program AST isn't provided (avoids array allocation entirely)
    let line = 1;
    const len = Math.min(offset, code.length);
    for (let i = 0; i < len; i++) {
      if (code.charCodeAt(i) === 10) {
        line++;
      }
    }
    return line;
  }

  // Binary search
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (offsets[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
}
