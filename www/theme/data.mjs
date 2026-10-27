// The facts the home page states. Keep them true: refresh the benchmarks with
// `node --run benchmark` from `www/`, and the showcase as sites adopt (or
// leave) doc-kit.

import benchmarks from './benchmarks.json' with { type: 'json' };

const count = number => number.toLocaleString('en');

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

const { site, node } = benchmarks;

const shared = {
  runsEach: WORDS[benchmarks.runs] ?? benchmarks.runs,
  machine: benchmarks.machine,
  commit: benchmarks.commit,
};

/**
 * Building the Node.js API docs, the largest doc-kit site we know of, with the
 * configuration of the Node.js preview site.
 */
export const BENCHMARK = {
  ...shared,
  title: `The Node.js ${node.version} API docs, start to finish`,
  subtitle: `${node.files} files · ${count(node.words)} words`,
  pages: node.results['section-pages'].pages,
  // `-t <generator>` on its own, then every one of them in a single run
  runs: [
    {
      label: 'llms-txt',
      seconds: node.results['llms-txt'].seconds,
      detail: 'LLMs.txt',
    },
    {
      label: 'orama-db',
      seconds: node.results['orama-db'].seconds,
      detail: 'The search index',
    },
    {
      label: 'json',
      seconds: node.results.json.seconds,
      detail: `${node.results.json.files} JSON documents`,
    },
    {
      label: 'section-pages',
      seconds: node.results['section-pages'].seconds,
      detail: `The site: ${node.results['section-pages'].pages} pages`,
    },
  ],
  together: {
    seconds: node.results.all.seconds,
    detail: `All of it in one run: ${node.results.all.files} files`,
  },
  // Gzipped, the JavaScript this site's home page loads before its islands
  // hydrate
  clientKilobytes: site.results.all.clientKilobytes,
};

/**
 * Building this site, from its own sources, with its own configuration.
 */
export const SITE_BENCHMARK = {
  ...shared,
  title: 'This site, start to finish',
  subtitle: `${site.pages} pages · ${count(site.words)} words`,
  pages: site.pages,
  documents: site.results.json.files,
  runs: [
    {
      label: 'llms-txt',
      seconds: site.results['llms-txt'].seconds,
      detail: 'LLMs.txt',
    },
    {
      label: 'orama-db',
      seconds: site.results['orama-db'].seconds,
      detail: 'The search index',
    },
    {
      label: 'json',
      seconds: site.results.json.seconds,
      detail: `${site.results.json.files} JSON documents`,
    },
    {
      label: 'html',
      seconds: site.results.html.seconds,
      detail: `The site: ${site.pages} pages, bundled with Vite`,
    },
  ],
  together: {
    seconds: site.results.all.seconds,
    detail: `All of it in one run: ${site.results.all.files} files`,
  },
};

// Sites built with doc-kit, in the strip under the hero
export const SHOWCASE = [
  { name: 'Node.js API', url: 'https://nodejs.org/api/' },
  { name: 'Node.js Learn', url: 'https://nodejs.org/learn' },
  { name: 'Undici', url: 'https://undici.nodejs.org/' },
  { name: 'webpack', url: 'https://webpack-doc-kit.vercel.app/' },
];

// Monthly requests to the Node.js API docs, as presented at NodeConf EU 2026
export const NODE_DOCS_REQUESTS = '5B';

// Built-in generators, but for the ones kept for Node.js's classic layouts
export const GENERATOR_COUNT = 12;
