import { globSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCHEMA_VERSION } from '../packages/core/src/generators/json/constants.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..');
const THEME = join(ROOT, 'theme');
const GENERATORS = join(REPO, 'packages', 'core', 'src', 'generators');

const require = createRequire(import.meta.url);

const { version } = require('../packages/core/package.json');

const REPOSITORY = 'nodejs/doc-kit';
const BASE_URL = 'https://doc-kit.nodejs.org';

const DESCRIPTION =
  'doc-kit turns Markdown and MDX into API docs: a fast, searchable site, ' +
  "JSON, LLMs.txt and more. It's the toolkit behind the Node.js API docs.";

// The generators' reference pages, by what they make. Each is named for its
// output in the sidebar; its page gives its target name.
const generatorPages = names =>
  Object.entries(names).map(([name, label]) => ({
    label,
    link: `/generators/${name}`,
  }));

const generatorItems = [
  { label: 'Overview', link: '/generators' },
  ...generatorPages({
    html: 'Website',
    'section-pages': 'Section pages',
    'orama-db': 'Search index',
    sitemap: 'Sitemap',
    'llms-txt': 'llms.txt',
    json: 'JSON',
  }),
];

const stageItems = generatorPages({
  ast: 'Parsing Markdown',
  'ast-js': 'Parsing JavaScript',
  metadata: 'API entries',
  'jsx-ast': 'Page JSX',
});

const introductionItems = [
  { label: 'Why doc-kit', link: '/introduction' },
  { label: 'Getting started', link: '/getting-started' },
];

const guideItems = [
  { label: 'Writing documentation', link: '/writing-docs' },
  { label: 'Documenting TypeScript', link: '/typescript' },
  { label: 'Customizing the site', link: '/customization' },
  { label: 'Publishing your docs', link: '/publishing' },
  { label: 'Creating generators', link: '/creating-generators' },
];

// The home page's animations. They hydrate on the client, so they must be
// listed in `components` for doc-kit to register their islands.
const ISLANDS = {
  HeroFlow: 'components/HeroFlow.jsx',
  PipelineFlow: 'components/PipelineFlow.jsx',
};

// The components `www/pages/index.mdx` lays out its sections with: every
// export of these modules
const HOME = Object.fromEntries(
  ['home/sections.jsx'].map(file => [
    file,
    Array.from(
      readFileSync(join(THEME, file), 'utf-8').matchAll(
        /^export const (\w+)/gm
      ),
      ([, name]) => name
    ),
  ])
);

const componentAliases = {
  ...Object.fromEntries(
    Object.entries(ISLANDS).map(([name, file]) => [
      `#theme/${name}`,
      join(THEME, file),
    ])
  ),
  ...Object.fromEntries(
    Object.keys(HOME).map(file => [
      `#theme/${file.replace(/\.jsx$/, '')}`,
      join(THEME, file),
    ])
  ),
};

const components = {
  ...Object.fromEntries(
    Object.keys(ISLANDS).map(name => [name, `#theme/${name}`])
  ),
  ...Object.fromEntries(
    Object.entries(HOME).flatMap(([file, names]) =>
      names.map(name => [
        name,
        {
          source: `#theme/${file.replace(/\.jsx$/, '')}`,
          isDefaultExport: false,
        },
      ])
    )
  ),
};

// Build-time facts for the theme, as the `#theme/site` module
const site = {
  version,
  generators: globSync(
    'packages/{core/src/generators,react/src,node/src}/*/generate.mjs',
    { cwd: REPO }
  ).length,
};

const INTER = dirname(
  require.resolve('@fontsource-variable/inter/package.json')
);

/** @type {import('../packages/core/src/utils/configuration/types').Configuration} */
export default {
  target: ['html', 'orama-db', 'json', 'llms-txt', 'llms-txt-full', 'sitemap'],

  global: {
    // `www/content/` is assembled by `scripts/build-docs-content.mjs`.
    input: [join(ROOT, 'content', '**', '*.{md,mdx}')],
    output: join(ROOT, 'out'),

    project: 'doc-kit',
    version,
    repository: REPOSITORY,
    ref: 'main',
    baseURL: BASE_URL,
    minify: true,
  },

  'jsx-ast': {
    showReadingTime: true,
  },

  sitemap: {
    pageURL: '{baseURL}{path}',
  },

  html: {
    title: '{project}',
    // The host serves pages without their extension
    pageURL: '{baseURL}{path}',
    templatePath: join(THEME, 'template.html'),
    stylesheets: [join(THEME, 'styles', 'index.css')],

    // Pages are assembled into `www/content/` at build time, so there is no
    // single source file a `{path}` template could point at. Link to the repo
    // instead; a per-page link would need a `#theme/Metabar` override that maps
    // each slug back to its true origin.
    editURL: `https://github.com/${REPOSITORY}`,

    imports: {
      '#theme/Layout': join(THEME, 'Layout.jsx'),
      '#theme/Logo': join(THEME, 'Logo.jsx'),
      '#theme/Footer': join(THEME, 'Footer.jsx'),
      ...componentAliases,
    },

    virtualImports: {
      '#theme/site': Object.entries(site)
        .map(
          ([name, value]) => `export const ${name} = ${JSON.stringify(value)};`
        )
        .join('\n'),
    },

    components,

    pathsToCopy: [
      { [join(ROOT, 'content')]: '.' },
      { [join(ROOT, 'public')]: '.' },
      { [join(REPO, 'docs', 'diagrams')]: 'diagrams' },
      {
        [join(INTER, 'files', 'inter-latin-wght-normal.woff2')]:
          'fonts/inter-latin-wght-normal.woff2',
        [join(INTER, 'files', 'inter-latin-wght-italic.woff2')]:
          'fonts/inter-latin-wght-italic.woff2',
      },
      {
        [join(GENERATORS, 'json', 'schema.json')]:
          `schemas/api-doc/${SCHEMA_VERSION}.json`,
        [join(GENERATORS, 'json-all', 'schema.json')]:
          `schemas/api-doc-all/${SCHEMA_VERSION}.json`,
      },
    ],

    navigation: {
      showCrossLinks: true,
      navbar: [
        { text: 'Guide', link: '/getting-started' },
        { text: 'Reference', link: '/configuration' },
        { text: 'Generators', link: '/generators' },
        { text: 'Specification', link: '/specification' },
      ],
      sidebar: [
        { groupName: 'Introduction', items: introductionItems },
        { groupName: 'Guides', items: guideItems },
        {
          groupName: 'Reference',
          items: [
            { label: 'CLI', link: '/cli' },
            { label: 'Configuration', link: '/configuration' },
            { label: 'Markdown specification', link: '/specification' },
          ],
        },
        { groupName: 'Generators', items: generatorItems },
        { groupName: 'Under the hood', items: stageItems },
        {
          groupName: 'Packages',
          items: [
            { label: '`@doc-kit/cli`', link: '/packages/cli' },
            { label: '`@doc-kit/core`', link: '/packages/core' },
            {
              label: '`@doc-kit/generator-react`',
              link: '/packages/react',
            },
            { label: '`@doc-kit/typedoc`', link: '/packages/typedoc' },
            { label: '`@node-core/doc-kit`', link: '/packages/node' },
            {
              label: '`@node-core/doc-kit-legacy`',
              link: '/packages/node-legacy',
            },
          ],
        },
        {
          groupName: 'Contributing',
          items: [
            { label: 'Adding a command', link: '/contributing/commands' },
            { label: 'Adding a comparator', link: '/contributing/comparators' },
          ],
        },
      ],
    },

    head: {
      meta: [
        { name: 'description', content: DESCRIPTION },
        { property: 'og:description', content: DESCRIPTION },
        { property: 'og:image', content: `${BASE_URL}/og.png` },
        { property: 'og:site_name', content: 'doc-kit' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      html: [],
    },
  },
};
