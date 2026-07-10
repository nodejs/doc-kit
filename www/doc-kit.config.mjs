import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const { version } = JSON.parse(
  readFileSync(join(ROOT, '..', 'package.json'), 'utf-8')
);

const REPOSITORY = 'nodejs/doc-kit';
const BASE_URL = 'https://doc-kit-docs.vercel.app';

const DESCRIPTION =
  'doc-kit is the documentation toolchain behind the Node.js API reference — ' +
  'a pipeline that turns API-shaped Markdown into HTML, JSON, man pages and more.';

/** @type {import('../src/utils/configuration/types').Configuration} */
export default {
  target: ['orama-db', 'web'],

  global: {
    // `www/content/` is assembled by `scripts/build-docs-content.mjs`.
    input: [join(ROOT, 'content', '*.md')],
    output: join(ROOT, 'out'),

    version,
    repository: REPOSITORY,
    ref: 'main',
    baseURL: BASE_URL,
    minify: true,

    // Both default to fetching from nodejs/node over the network. This site has
    // no Node.js release matrix and no `index.md`, and an array short-circuits
    // the parse step, so pass empty ones rather than paying for the request.
    changelog: [],
    index: [],
  },

  'jsx-ast': {
    // `jsx-ast` otherwise synthesizes an `index.html` holding the Node.js API
    // stability overview, and it silently overrides an authored `index.md`.
    // This site has no stability metadata, so that page would render empty.
    generateIndexPage: false,
  },

  web: {
    project: 'doc-kit',
    title: '{project} documentation',

    // The default is `{baseURL}/latest-{version}/api{path}.html`, which encodes
    // Node.js's versioned-docs layout. This site publishes a single flat tree.
    pageURL: `${BASE_URL}{path}.html`,

    // Pages are assembled into `www/content/` at build time, so there is no
    // single source file a `{path}` template could point at. Link to the repo
    // instead; a per-page link would need a `#theme/Metabar` override that maps
    // each slug back to its true origin.
    editURL: `https://github.com/${REPOSITORY}`,

    imports: {
      // Sidebar order and grouping are not configurable; see the component.
      '#theme/Sidebar': join(ROOT, 'theme', 'SideBar.jsx'),
    },

    head: {
      meta: [
        { name: 'description', content: DESCRIPTION },
        { property: 'og:description', content: DESCRIPTION },
      ],
      links: [],
      html: [],
    },
  },
};
