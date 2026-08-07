import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..');

const { version } = JSON.parse(
  readFileSync(join(REPO, 'packages', 'core', 'package.json'), 'utf-8')
);

const PUBLIC_GENERATORS = [
  'html',
  'orama-db',
  'llms-txt',
  'sitemap',
  'json-simple',
  'legacy-html',
  'legacy-html-all',
  'legacy-json',
  'legacy-json-all',
  'man-page',
  'api-links',
  'addon-verify',
];

const generatorItems = [
  { label: 'Overview', link: '/generators' },
  ...PUBLIC_GENERATORS.map(name => ({
    label: `\`${name}\``,
    link: `/generators/${name}`,
  })),
];

const REPOSITORY = 'nodejs/doc-kit';
const BASE_URL = 'https://doc-kit.nodejs.org';

const DESCRIPTION =
  'doc-kit turns API-shaped Markdown into documentation — a searchable ' +
  'site, JSON, llms.txt, man pages, and more. It is the toolchain behind ' +
  'the Node.js API reference.';

/** @type {import('../packages/core/src/utils/configuration/types').Configuration} */
export default {
  target: ['orama-db', 'legacy-json', 'html'],

  global: {
    // `www/content/` is assembled by `scripts/build-docs-content.mjs`.
    input: [join(ROOT, 'content', '**', '*.md')],
    output: join(ROOT, 'out'),

    project: 'doc-kit',
    version,
    repository: REPOSITORY,
    ref: 'main',
    baseURL: BASE_URL,
    minify: true,
  },

  'jsx-ast': {
    // `jsx-ast` otherwise synthesizes an `index.html` holding the Node.js API
    // stability overview, and it silently overrides an authored `index.md`.
    // This site has no stability metadata, so that page would render empty.
    generateIndexPage: false,
  },

  html: {
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
          groupName: 'Start',
          items: [
            { label: '`doc-kit`', link: '/index' },
            { label: 'Getting started', link: '/getting-started' },
          ],
        },
        {
          groupName: 'Guides',
          items: [
            { label: 'Writing documentation', link: '/writing-docs' },
            { label: 'Customizing the site', link: '/customization' },
            { label: 'Publishing your docs', link: '/publishing' },
          ],
        },
        {
          groupName: 'Reference',
          items: [
            { label: 'CLI', link: '/cli' },
            { label: 'Configuration', link: '/configuration' },
            { label: 'Specification', link: '/specification' },
          ],
        },
        { groupName: 'Generators', items: generatorItems },
        {
          groupName: 'Packages',
          items: [
            { label: '`@nodejs/doc-kit`', link: '/packages/core' },
            {
              label: '`@doc-kit/generator-react`',
              link: '/packages/react',
            },
            {
              label: '`@doc-kit/generator-legacy`',
              link: '/packages/legacy',
            },
            { label: '`@node-core/doc-kit`', link: '/packages/node' },
          ],
        },
        {
          groupName: 'Extending',
          items: [
            { label: 'Creating generators', link: '/creating-generators' },
            { label: 'Creating comparators', link: '/comparators' },
          ],
        },
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
