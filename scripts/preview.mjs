#!/usr/bin/env node

// Builds one of the two doc sites in this repository, then serves it locally:
//
//   node scripts/preview.mjs node  -> ./out       served on http://localhost:3000
//   node scripts/preview.mjs docs  -> ./www/out   served on http://localhost:3001
//
// The `node` build mirrors `scripts/vercel-build.sh` and needs the Node.js
// source clone in `./node` (see `scripts/vercel-prepare.sh`); the `docs` build
// is `scripts/vercel-docs-build.sh`. Press Ctrl+C to stop the server.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = join(import.meta.dirname, '..');
const CLI = join(ROOT, 'packages', 'cli', 'bin', 'cli.mjs');
const NODE_API_DIR = join(ROOT, 'node', 'doc', 'api');

const SITES = {
  node: { dir: './out', port: 3000 },
  docs: { dir: './www/out', port: 3001 },
};

const mode = process.argv[2];

if (!SITES[mode]) {
  console.error(
    `Usage: node scripts/preview.mjs <${Object.keys(SITES).join('|')}>`
  );
  process.exit(1);
}

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });

  if (result.error) {
    console.error(`Failed to run \`${command}\`: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
};

const resolveVersion = () => {
  const tagFile = join(ROOT, '.node-tag');

  if (existsSync(tagFile)) {
    return readFileSync(tagFile, 'utf8').trim();
  }

  const result = spawnSync(
    'git',
    ['-C', join(ROOT, 'node'), 'describe', '--tags', '--abbrev=0'],
    { encoding: 'utf8' }
  );

  return result.status === 0 ? result.stdout.trim() : undefined;
};

const buildNodeDocs = () => {
  if (
    !existsSync(NODE_API_DIR) ||
    readdirSync(NODE_API_DIR).filter(file => file.endsWith('.md')).length === 0
  ) {
    console.error(
      'No Node.js API sources in ./node/doc/api. Prepare them first with:\n' +
        '  bash scripts/vercel-prepare.sh\n' +
        '(clones the latest nodejs/node release into ./node)'
    );
    process.exit(1);
  }

  console.log('Building Node.js API docs into ./out …');

  const args = [
    'generate',
    '-t',
    'orama-db',
    '-t',
    'legacy-json',
    '-t',
    'llms-txt',
    '-t',
    'html',
    '-i',
    './node/doc/api/*.md',
    '--ignore',
    './node/doc/api/quic.md',
    '-o',
    './out',
    '-c',
    './node/CHANGELOG.md',
    '--type-map',
    './node/doc/type-map.json',
    '--config-file',
    './beta/doc-kit.config.mjs',
    '--log-level',
    'debug',
  ];
  const version = resolveVersion();

  if (version) {
    args.push('-v', version);
  }

  run(process.execPath, [CLI, ...args]);
};

const buildDocsSite = () => {
  console.log('Building doc-kit docs into ./www/out …');
  run('bash', [join(ROOT, 'scripts', 'vercel-docs-build.sh')]);
};

const { dir, port } = SITES[mode];

if (mode === 'node') {
  buildNodeDocs();
} else {
  buildDocsSite();
}

console.log(`\nServing ${dir} on http://localhost:${port} …`);

const server = spawn('npx', ['--yes', 'serve', dir, '-l', String(port)], {
  cwd: ROOT,
  stdio: 'inherit',
});

server.on('error', error => {
  console.error(`Failed to start the server: ${error.message}`);
  process.exit(1);
});

server.on('exit', code => {
  process.exit(code ?? 0);
});
