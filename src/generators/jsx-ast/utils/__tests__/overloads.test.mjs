import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { annotateOverloads } from '../overloads.mjs';

const entry = (name, type, slug, depth = 2, text = `${name}(...)`) => ({
  heading: { depth, data: { name, type, slug, text } },
});

describe('annotateOverloads', () => {
  it('flags every overload after the first heading of a run', () => {
    const entries = [
      entry('fs.read', 'method', 'fsreadfd'),
      entry('fs.read', 'method', 'fsreadbuffer'),
      entry('fs.read', 'method', 'fsreadoptions'),
    ];

    annotateOverloads(entries);

    // The first (most stable) heading is left as-is...
    assert.ok(!entries[0].heading.data.isOverload);
    // ...and the rest are flagged so the ToC can drop them.
    assert.ok(entries[1].heading.data.isOverload);
    assert.ok(entries[2].heading.data.isOverload);
  });

  it('leaves a single-signature function untouched', () => {
    const entries = [entry('fs.access', 'method', 'fsaccess')];

    annotateOverloads(entries);

    assert.ok(!entries[0].heading.data.isOverload);
  });

  it('groups constructors by name', () => {
    const entries = [
      entry('Buffer', 'ctor', 'new-bufferarray'),
      entry('Buffer', 'ctor', 'new-buffersize'),
    ];

    annotateOverloads(entries);

    assert.ok(!entries[0].heading.data.isOverload);
    assert.ok(entries[1].heading.data.isOverload);
  });

  it('does not group headings of different types or depths', () => {
    const entries = [
      entry('Buffer', 'class', 'class-buffer'),
      entry('Buffer', 'ctor', 'new-bufferarray'),
      entry('Buffer', 'ctor', 'new-buffersize', 3),
    ];

    annotateOverloads(entries);

    // class is not overloadable; the two ctors differ in depth, so none group.
    assert.ok(entries.every(e => !e.heading.data.isOverload));
  });

  it('starts a fresh group when a different function interrupts a run', () => {
    const entries = [
      entry('fs.read', 'method', 'fsreadfd'),
      entry('fs.read', 'method', 'fsreadbuffer'),
      entry('fs.write', 'method', 'fswritefd'),
      entry('fs.write', 'method', 'fswritebuffer'),
    ];

    annotateOverloads(entries);

    assert.deepEqual(
      entries.map(e => !!e.heading.data.isOverload),
      [false, true, false, true]
    );
  });
});
