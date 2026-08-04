import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..');

const { version } = JSON.parse(
  readFileSync(join(REPO, 'packages', 'core', 'package.json'), 'utf-8')
);

const generatorItems = globSync('packages/core/src/generators/*/README.md', {
  cwd: REPO,
})
  .map(file => basename(dirname(file)))
  .sort()
  .map(name => ({
    label: `\`${name}\``,
    link: `/generators/${name}`,
  }));

const REPOSITORY = 'nodejs/doc-kit';
const BASE_URL = 'https://doc-kit-docs.vercel.app';

const DESCRIPTION =
  'doc-kit is the documentation toolchain behind the Node.js API reference — ' +
  'a pipeline that turns API-shaped Markdown into HTML, JSON, man pages and more.';

/** @type {import('../packages/core/src/utils/configuration/types').Configuration} */
export default {
  target: ['orama-db', 'legacy-json', 'html'],

  global: {
    // `www/content/` is assembled by `scripts/build-docs-content.mjs`.
    input: [join(ROOT, 'content', '**', '*.md')],
    output: join(ROOT, 'out'),

    version,
    repository: REPOSITORY,
    ref: 'main',
    baseURL: BASE_URL,
    minify: true,

    // This site has no `index.md`; an array short-circuits the parse step.
    // (An empty `changelog` is the default: no version picker.)
    index: [],
  },

  'jsx-ast': {
    // `jsx-ast` otherwise synthesizes an `index.html` holding the Node.js API
    // stability overview, and it silently overrides an authored `index.md`.
    // This site has no stability metadata, so that page would render empty.
    generateIndexPage: false,
  },

  html: {
    project: 'doc-kit',
    title: '{project} documentation',

    // Pages are assembled into `www/content/` at build time, so there is no
    // single source file a `{path}` template could point at. Link to the repo
    // instead; a per-page link would need a `#theme/Metabar` override that maps
    // each slug back to its true origin.
    editURL: `https://github.com/${REPOSITORY}`,

    pathsToCopy: [{ [join(ROOT, 'content')]: '.' }],

    navigation: {
      sidebar: [
        {
          groupName: 'Pages',
          items: [
            { label: '`doc-kit`', link: '/index' },
            { label: 'Getting started', link: '/getting-started' },
            { label: 'Configuration', link: '/configuration' },
            { label: 'Creating Commands', link: '/commands' },
            { label: 'Creating Generators', link: '/generators' },
            { label: 'Specification', link: '/specification' },
            { label: 'Creating Comparators', link: '/comparators' },
          ],
        },
        { groupName: 'Generators', items: generatorItems },
      ],
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
