'use strict';

import { join } from 'node:path';

import {
  CHANGELOG_URL,
  GITHUB_EDIT_URL,
  populate,
} from '@nodejs/doc-kit/utils/configuration/templates.mjs';

const NODE_REPOSITORY = { repository: 'nodejs/node', ref: 'HEAD' };

/**
 * The Node.js preset: configures the project-neutral doc-kit generators the
 * way nodejs.org builds its API documentation — branding, URL layouts, and
 * release history included.
 *
 * Use it from a configuration file:
 *
 * ```mjs
 * export default {
 *   extends: '@node-core/doc-kit/config',
 * };
 * ```
 *
 * @type {Partial<import('@nodejs/doc-kit/utils/configuration/types').Configuration>}
 */
export default {
  global: {
    project: 'Node.js',
    ...NODE_REPOSITORY,
    baseURL: 'https://nodejs.org/docs',
    changelog: populate(CHANGELOG_URL, NODE_REPOSITORY),
  },

  html: {
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    remoteConfigUrl: 'https://nodejs.org/site.json',

    head: {
      meta: [
        {
          name: 'description',
          content:
            'Node.js® is a free, open-source, cross-platform JavaScript ' +
            'runtime environment that lets developers create servers, web ' +
            'apps, command line tools and scripts.',
        },
        {
          property: 'og:description',
          content:
            'Node.js® is a free, open-source, cross-platform JavaScript ' +
            'runtime environment that lets developers create servers, web ' +
            'apps, command line tools and scripts.',
        },
        {
          property: 'og:image',
          content:
            'https://nodejs.org/en/next-data/og/announcement/Node.js%20%E2%80%94%20Run%20JavaScript%20Everywhere',
        },
      ],
      links: [
        {
          rel: 'icon',
          href: 'https://nodejs.org/static/images/favicons/favicon.png',
        },
      ],
    },

    imports: {
      '#theme/Logo': '@node-core/ui-components/Common/NodejsLogo',
    },
  },

  'llms-txt': {
    templatePath: join(import.meta.dirname, 'llms-template.txt'),
    pageURL: '{baseURL}/latest/api{path}.md',
  },

  sitemap: {
    indexURL: '{baseURL}/latest/api/',
  },
};
