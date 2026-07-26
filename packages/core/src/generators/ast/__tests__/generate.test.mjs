import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { STABILITY_INDEX_URL } from '../constants.mjs';
import { processChunk } from '../generate.mjs';

let dir;

// Writes `content` to `<name>` in the temp dir and returns the
// `[path, parent]` tuple `processChunk` expects.
const file = async (name, content) => {
  const path = join(dir, name);
  await writeFile(path, content);
  return [path, dir];
};

// Runs a single file through `processChunk` and returns its result entry.
const process = async tuple => {
  const [result] = await processChunk([tuple], [0]);
  return result;
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ast-generate-'));
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('processChunk', () => {
  describe('MDX detection', () => {
    it('parses a plain .md file as markdown (mdx: false)', async () => {
      const result = await process(await file('plain.md', '# Title\n'));

      assert.strictEqual(result.mdx, false);
    });

    it('parses a .mdx file as MDX (mdx: true)', async () => {
      const result = await process(await file('page.mdx', '# Title\n'));

      assert.strictEqual(result.mdx, true);
    });

    it('lets frontmatter `mdx: true` opt a .md file in', async () => {
      const result = await process(
        await file('optin.md', '---\nmdx: true\n---\n\n# Title\n')
      );

      assert.strictEqual(result.mdx, true);
    });

    it('lets frontmatter `mdx: false` opt a .mdx file out', async () => {
      const result = await process(
        await file('optout.mdx', '---\nmdx: false\n---\n\n# Title\n')
      );

      assert.strictEqual(result.mdx, false);
    });

    it('falls back to the extension when frontmatter fails to parse', async () => {
      // Node.js core uses a non-standard frontmatter dialect; a YAML parse
      // error must not throw and must defer to the `.mdx` extension.
      const result = await process(
        await file('weird.mdx', '---\n: : not: valid: yaml\n---\n\n# Title\n')
      );

      assert.strictEqual(result.mdx, true);
    });

    it('falls back to the extension when frontmatter lacks an mdx key', async () => {
      const result = await process(
        await file('nokey.md', '---\nadded: v1.0.0\n---\n\n# Title\n')
      );

      assert.strictEqual(result.mdx, false);
    });
  });

  describe('output shape', () => {
    it('strips the extension from the relative path', async () => {
      const result = await process(await file('fs.md', '# fs\n'));

      assert.strictEqual(result.path, '/fs');
    });

    it('returns a parsed mdast tree', async () => {
      const result = await process(await file('tree.md', '# Heading\n'));

      assert.strictEqual(result.tree.type, 'root');
      assert.strictEqual(result.tree.children[0].type, 'heading');
    });
  });

  describe('frontmatter handling', () => {
    it('rewrites .md frontmatter into a YAML html comment', async () => {
      const result = await process(
        await file('meta.md', '---\nadded: v1.0.0\n---\n\n# Title\n')
      );

      const html = result.tree.children.find(n => n.type === 'html');
      assert.ok(html, 'expected an html node');
      assert.match(html.value, /<!-- YAML\nadded: v1\.0\.0\n-->/);
    });

    it('re-attaches MDX frontmatter as a leading YAML html node', async () => {
      const result = await process(
        await file('mdxmeta.mdx', '---\nadded: v1.0.0\n---\n\n# Title\n')
      );

      const [first] = result.tree.children;
      assert.strictEqual(first.type, 'html');
      assert.match(first.value, /<!-- YAML\nadded: v1\.0\.0\n-->/);
    });

    it('keeps MDX JSX as expression nodes rather than type annotations', async () => {
      const result = await process(
        await file('jsx.mdx', '# Title\n\n<Foo bar="x" />\n\n{1 + 1}\n')
      );

      const types = result.tree.children.map(n => n.type);
      assert.ok(types.includes('mdxJsxFlowElement'));
      assert.ok(types.includes('mdxFlowExpression'));
    });
  });

  describe('stability index', () => {
    it('rewrites the stability prefix into a link in markdown mode', async () => {
      const result = await process(
        await file('stab.md', '# fs\n\n> Stability: 2 - Stable\n')
      );

      const blockquote = result.tree.children.find(
        n => n.type === 'blockquote'
      );
      const link = blockquote.children[0].children.find(n => n.type === 'link');

      assert.strictEqual(link.url, STABILITY_INDEX_URL);
    });

    it('rewrites the stability prefix into a link in MDX mode', async () => {
      const result = await process(
        await file('stab.mdx', '# fs\n\n> Stability: 2 - Stable\n')
      );

      const blockquote = result.tree.children.find(
        n => n.type === 'blockquote'
      );
      const link = blockquote.children[0].children.find(n => n.type === 'link');

      assert.strictEqual(link.url, STABILITY_INDEX_URL);
    });
  });

  describe('chunking', () => {
    it('only processes the requested indices', async () => {
      const a = await file('a.md', '# A\n');
      const b = await file('b.md', '# B\n');
      const c = await file('c.md', '# C\n');

      const results = await processChunk([a, b, c], [0, 2]);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].path, '/a');
      assert.strictEqual(results[1].path, '/c');
    });
  });
});
