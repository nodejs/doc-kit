// Measures the builds the home page quotes, and writes them to
// `theme/benchmarks.json`, which `theme/data.mjs` reads:
//
// - this site, from its own sources, with its own configuration;
// - the Node.js API docs of a Node.js release, with the configuration of the
//   Node.js preview site (`beta/doc-kit.config.mjs`).
//
// Each target is built on its own, then all of them in one run, from a clean
// output directory every time, and the median wall time is kept.
//
//   node --run benchmark [-- --runs 5 --node v26.12.1]

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, glob, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const REPO = join(import.meta.dirname, '..');
const CLI = join(REPO, 'packages', 'cli', 'bin', 'cli.mjs');
const CACHE = join(REPO, 'node_modules', '.cache', 'doc-kit-benchmark');

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '5' },
    node: { type: 'string' },
  },
});

const RUNS = Number(values.runs);

const git = (...args) =>
  execFileSync('git', args, { cwd: REPO, encoding: 'utf-8' }).trim();

const median = numbers => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const files = async (dir, pattern = '**/*') =>
  (await Array.fromAsync(glob(pattern, { cwd: dir, withFileTypes: true })))
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name));

const words = async paths =>
  (await Promise.all(paths.map(path => readFile(path, 'utf-8')))).reduce(
    (total, text) => total + (text.match(/\S+/g)?.length ?? 0),
    0
  );

/**
 * Builds once into a fresh directory, returning the seconds it took and the
 * directory, which the caller removes.
 *
 * @param {Array<string>} args The CLI's arguments after `generate`
 */
const build = async args => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-benchmark-'));
  const start = performance.now();

  const { status, stderr } = spawnSync(
    process.execPath,
    [CLI, 'generate', ...args, '-o', output, '--log-level', 'error'],
    { cwd: REPO, encoding: 'utf-8' }
  );

  if (status !== 0) {
    throw new Error(`doc-kit generate ${args.join(' ')} failed:\n${stderr}`);
  }

  return { seconds: (performance.now() - start) / 1000, output };
};

/**
 * Builds each target on its own and all of them together, `RUNS` times each.
 *
 * @param {Record<string, Array<string>>} targets Each target's arguments
 * @param {Array<string>} all The arguments of the run that builds them all
 * @param {Array<string>} common Arguments every run shares
 * @param {{ client?: boolean }} options Whether to measure the JavaScript the
 * home page loads up front
 */
const measure = async (targets, all, common, { client = false } = {}) => {
  const results = {};

  for (const [name, args] of [...Object.entries(targets), ['all', all]]) {
    const times = [];

    for (let run = 0; run < RUNS; run++) {
      const { seconds, output } = await build([...common, ...args]);
      times.push(seconds);

      // Count what the last run wrote
      if (run === RUNS - 1) {
        const written = await files(output);
        results[name] = {
          seconds: Number(median(times).toFixed(2)),
          files: written.length,
          pages: written.filter(path => path.endsWith('.html')).length,
          clientKilobytes:
            client && name === 'all' ? await clientSize(output) : undefined,
        };
      }

      await rm(output, { recursive: true, force: true });
    }

    console.log(`${name}: ${results[name].seconds} s`);
  }

  return results;
};

/**
 * The gzipped size, in kB, of the JavaScript the home page loads up front.
 *
 * @param {string} output A site build
 */
const clientSize = async output => {
  const index = join(output, 'index.html');

  if (!existsSync(index)) {
    return undefined;
  }

  const html = await readFile(index, 'utf-8');
  const scripts = [...html.matchAll(/<script[^>]+src="?([^"\s>]+)/g)].map(
    ([, src]) => join(output, src.replace(/^\.?\//, ''))
  );
  const bytes = (await Promise.all(scripts.map(path => readFile(path))))
    .map(data => gzipSync(data).length)
    .reduce((total, size) => total + size, 0);

  return Math.round(bytes / 1024);
};

/**
 * The site's own sources, as `scripts/build-docs-content.mjs` assembles them,
 * copied so that edits made during the run don't change what's measured.
 */
const site = async () => {
  execFileSync(process.execPath, ['scripts/build-docs-content.mjs'], {
    cwd: REPO,
    stdio: 'ignore',
  });

  const content = join(CACHE, 'site');
  await rm(content, { recursive: true, force: true });
  await cp(join(REPO, 'www', 'content'), content, { recursive: true });

  const sources = await files(content, '**/*.{md,mdx}');
  const common = [
    '--config-file',
    join(REPO, 'www', 'doc-kit.config.mjs'),
    '-i',
    `${content}/**/*.{md,mdx}`,
  ];

  return {
    pages: sources.length,
    words: await words(sources),
    results: await measure(
      {
        'llms-txt': ['-t', 'llms-txt'],
        'orama-db': ['-t', 'orama-db'],
        json: ['-t', 'json'],
        html: ['-t', 'html'],
      },
      [],
      common,
      { client: true }
    ),
  };
};

/**
 * The latest Node.js release, or the one asked for, checked out once into the
 * cache: only its docs, its JavaScript and its changelog.
 */
const nodeCheckout = async () => {
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

  const dir = join(CACHE, `node-${tag}`);

  if (!existsSync(dir)) {
    git(
      '-c',
      'advice.detachedHead=false',
      'clone',
      '-q',
      '--depth',
      '1',
      '--branch',
      tag,
      '--filter=blob:none',
      '--sparse',
      'https://github.com/nodejs/node.git',
      dir
    );
    git('-C', dir, 'sparse-checkout', 'set', 'doc', 'lib');
  }

  return { tag, dir };
};

const nodeDocs = async () => {
  const { tag, dir } = await nodeCheckout();
  const api = join(dir, 'doc', 'api');

  // quic.md is left out, as Node.js's own build does
  const sources = (await files(api, '*.md')).filter(
    path => !path.endsWith('quic.md')
  );
  const common = [
    '--config-file',
    join(REPO, 'beta', 'doc-kit.config.mjs'),
    '-i',
    `${api}/*.md`,
    '--ignore',
    join(api, 'quic.md'),
    '--type-map',
    join(dir, 'doc', 'type-map.json'),
    '-c',
    join(dir, 'CHANGELOG.md'),
    '-v',
    tag,
  ];
  const targets = {
    'llms-txt': ['-t', 'llms-txt'],
    'orama-db': ['-t', 'orama-db'],
    json: ['-t', 'json'],
    'section-pages': ['-t', 'section-pages'],
  };

  return {
    version: tag,
    files: sources.length,
    words: await words(sources),
    results: await measure(targets, Object.values(targets).flat(), common),
  };
};

const benchmarks = {
  machine: `${cpus()[0]
    .model.replace(/ with .*$/, '')
    .trim()} (${cpus().length} threads, ${Math.min(cpus().length, 4)} used by doc-kit) with Node.js ${process.versions.node}`,
  commit: git('rev-parse', '--short', 'HEAD'),
  runs: RUNS,
  site: await site(),
  node: await nodeDocs(),
};

await writeFile(
  join(import.meta.dirname, 'theme', 'benchmarks.json'),
  `${JSON.stringify(benchmarks, null, 2)}\n`
);

console.log(
  `Wrote ${relative(REPO, join(import.meta.dirname, 'theme', 'benchmarks.json'))}`
);
