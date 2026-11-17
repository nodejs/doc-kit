// Times the builds the website's home page quotes, and writes them to
// `www/theme/benchmarks.json`: the website itself, and a Node.js release's API
// docs with the Node.js preview site's configuration (`beta/`). Each target is
// built on its own, then all of them in one run, from an empty output
// directory, and the median of the runs is kept.
//
//   node scripts/benchmark.mjs [--runs 5] [--node v26.12.1]

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { glob, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..');
const CLI = join(ROOT, 'packages', 'cli', 'bin', 'cli.mjs');
const CACHE = join(ROOT, 'node_modules', '.cache', 'doc-kit-benchmark');

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '5' },
    node: { type: 'string' },
  },
});

const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' }).trim();

const median = numbers => {
  const sorted = numbers.toSorted((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const filesIn = async (dir, pattern = '**/*') =>
  Array.fromAsync(glob(pattern, { cwd: dir, withFileTypes: true }))
    .then(entries => entries.filter(entry => entry.isFile()))
    .then(entries => entries.map(entry => join(entry.parentPath, entry.name)));

/**
 * The gzipped size, in kB, of the scripts a built `index.html` loads.
 *
 * @param {string} output
 */
const clientKilobytes = async output => {
  const html = await readFile(join(output, 'index.html'), 'utf-8');
  const scripts = html.matchAll(/<script[^>]+src="?([^"\s>]+)/g);
  let bytes = 0;

  for (const [, src] of scripts) {
    bytes += gzipSync(await readFile(join(output, src))).length;
  }

  return Math.round(bytes / 1024);
};

/**
 * Builds each target on its own and then all of them together, `--runs`
 * times each, and counts what the last run of each wrote.
 *
 * @param {Array<string>} common Arguments every run shares
 * @param {Record<string, Array<string>>} targets Each target's arguments
 */
const measure = async (common, targets) => {
  const results = {};

  targets.all = Object.values(targets).flat();

  for (const [name, args] of Object.entries(targets)) {
    const times = [];
    let output;

    for (let run = 0; run < Number(values.runs); run++) {
      await rm(output ?? '', { recursive: true, force: true });
      output = await mkdtemp(join(tmpdir(), 'doc-kit-benchmark-'));

      const start = performance.now();
      const { status, stderr } = spawnSync(
        process.execPath,
        [
          CLI,
          'generate',
          ...common,
          ...args,
          '-o',
          output,
          '--log-level',
          'error',
        ],
        { cwd: ROOT, encoding: 'utf-8' }
      );

      if (status !== 0) {
        throw new Error(`generate ${args.join(' ')} failed:\n${stderr}`);
      }

      times.push((performance.now() - start) / 1000);
    }

    const written = await filesIn(output);

    results[name] = {
      seconds: Number(median(times).toFixed(2)),
      files: written.length,
      pages: written.filter(path => path.endsWith('.html')).length,
    };

    if (existsSync(join(output, 'index.html'))) {
      results[name].clientKilobytes = await clientKilobytes(output);
    }

    await rm(output, { recursive: true, force: true });
    console.log(`${name}: ${results[name].seconds} s`);
  }

  return results;
};

// The website, from the sources `build-docs-content.mjs` assembles
execFileSync(process.execPath, ['scripts/build-docs-content.mjs'], {
  cwd: ROOT,
});

const site = {
  pages: (await filesIn(join(ROOT, 'www', 'content'), '**/*.{md,mdx}')).length,
  results: await measure(
    ['--config-file', join(ROOT, 'www', 'doc-kit.config.mjs')],
    {
      'llms-txt': ['-t', 'llms-txt'],
      'orama-db': ['-t', 'orama-db'],
      json: ['-t', 'json'],
      html: ['-t', 'html'],
    }
  ),
};

// The latest Node.js release, or the one asked for, checked out once
const tag =
  values.node ??
  git(
    'ls-remote',
    '--tags',
    '--refs',
    '--sort=-v:refname',
    'https://github.com/nodejs/node.git',
    'v*'
  )
    .split('\n')
    .map(line => line.split('refs/tags/')[1])
    .find(name => !name.includes('-'));

const checkout = join(CACHE, `node-${tag}`);

if (!existsSync(checkout)) {
  git(
    'clone',
    '-q',
    '--depth',
    '1',
    '--branch',
    tag,
    '--filter=blob:none',
    '--sparse',
    'https://github.com/nodejs/node.git',
    checkout
  );
  git('-C', checkout, 'sparse-checkout', 'set', 'doc', 'lib');
}

const api = join(checkout, 'doc', 'api');

const node = {
  version: tag,
  files: (await filesIn(api, '*.md')).length,
  results: await measure(
    [
      '--config-file',
      join(ROOT, 'beta', 'doc-kit.config.mjs'),
      '-i',
      `${api}/*.md`,
      '--type-map',
      join(checkout, 'doc', 'type-map.json'),
      '-c',
      join(checkout, 'CHANGELOG.md'),
      '-v',
      tag,
    ],
    {
      'llms-txt': ['-t', 'llms-txt'],
      'orama-db': ['-t', 'orama-db'],
      json: ['-t', 'json'],
      'section-pages': ['-t', 'section-pages'],
    }
  ),
};

await writeFile(
  join(ROOT, 'www', 'theme', 'benchmarks.json'),
  `${JSON.stringify(
    {
      machine: `${cpus()[0]
        .model.replace(/ with .*$/, '')
        .trim()} with Node.js ${process.versions.node}`,
      commit: git('rev-parse', '--short', 'HEAD'),
      runs: Number(values.runs),
      site,
      node,
    },
    null,
    2
  )}\n`
);
