// The facts the home page states. Keep them true: update the benchmark when
// re-running it, and the showcase as sites adopt (or leave) doc-kit.

const count = number => number.toLocaleString('en');

// What each benchmark read and wrote, stated once for every string below
const NODE_API = { files: 70, words: 574_627, pages: 781, outputs: 923 };
const SITE = { pages: 34, documents: 34, words: 48_316 };

/**
 * Building the Node.js API reference, the largest doc-kit site we know of.
 * Medians of three clean builds of each.
 */
export const BENCHMARK = {
  title: 'The Node.js v26.12.1 API docs, start to finish',
  subtitle: `${NODE_API.files} files · ${count(NODE_API.words)} words`,
  pages: NODE_API.pages,
  runsEach: 'three',
  machine: 'AMD Ryzen 9 8945HX (16 cores, 4 worker threads) with Node.js 24.18',
  commit: 'ec7751f',
  // `-t <generator>` on its own, then every one of them in a single run
  runs: [
    { label: 'llms-txt', seconds: 2.11, detail: 'LLMs.txt' },
    { label: 'orama-db', seconds: 2.48, detail: 'The search index' },
    {
      label: 'json',
      seconds: 2.53,
      detail: `${NODE_API.files} JSON documents`,
    },
    {
      label: 'section-pages',
      seconds: 8.81,
      detail: `The site: ${NODE_API.pages} pages`,
    },
  ],
  together: {
    seconds: 10.11,
    detail: `All of it in one run: ${NODE_API.outputs} files`,
  },
  // Gzipped, the JavaScript a page loads before its islands hydrate
  clientKilobytes: 10,
};

/**
 * Building this site, from its own sources. Medians of five clean builds of
 * each.
 */
export const SITE_BENCHMARK = {
  title: 'This site, start to finish',
  subtitle: `${SITE.pages} pages · ${count(SITE.words)} words`,
  pages: SITE.pages,
  documents: SITE.documents,
  runsEach: 'five',
  machine: BENCHMARK.machine,
  commit: BENCHMARK.commit,
  runs: [
    { label: 'llms-txt', seconds: 0.53, detail: 'LLMs.txt' },
    { label: 'orama-db', seconds: 0.55, detail: 'The search index' },
    {
      label: 'json',
      seconds: 0.58,
      detail: `${SITE.documents} JSON documents`,
    },
    {
      label: 'html',
      seconds: 2.81,
      detail: `The site: ${SITE.pages} pages, bundled with Vite`,
    },
  ],
  together: { seconds: 3.0, detail: 'All of it in one run' },
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
