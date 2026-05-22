'use strict';

import {
  buildToC,
  buildNavigation,
  buildVersions,
  buildGitHub,
} from './buildDropdowns.mjs';
import tableOfContents from './tableOfContents.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';

/**
 * Replaces the template values in the API template with the given values.
 * @param {string} apiTemplate - The HTML template string
 * @param {import('../types').TemplateValues} values - The values to replace the template values with
 * @param {import('../../../utils/configuration/types').GlobalConfiguration} config
 * @param {{ skipGitHub?: boolean; skipGtocPicker?: boolean }} [options] - Optional settings
 * @returns {string} The replaced template values
 */
export const replaceTemplateValues = (
  apiTemplate,
  { path, api, added, section, toc, nav, content },
  config,
  { skipGitHub = false, skipGtocPicker = false } = {}
) => {
  const redirectMeta =
    api === 'index' && config.indexRedirectURL
      ? `<script>
      (function() {
        let p = window.location.pathname;
        let targetUrl = ${JSON.stringify(config.indexRedirectURL)};

        const isAbsolute = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

        if (!isAbsolute && !p.endsWith('/') && !p.split('/').pop().includes('.') && !p.endsWith('/index')) {
          targetUrl = p + '/' + targetUrl;
        }

        window.location.replace(targetUrl);
      })();
    </script>`
      : '';

  return apiTemplate
    .replace('__REDIRECT__', redirectMeta)
    .replace('__HOME_LINK__', config.indexRedirectURL || '/')
    .replace('__ID__', api)
    .replace(/__FILENAME__/g, api)
    .replace('__SECTION__', section)
    .replace(/__VERSION__/g, `v${config.version.version}`)
    .replace(/__TOC__/g, tableOfContents.wrapToC(toc))
    .replace(/__GTOC__/g, nav)
    .replace('__CONTENT__', content)
    .replace(
      /__TOC_PICKER__/g,
      config.indexRedirectURL && api === 'index' ? '' : buildToC(toc)
    )
    .replace(/__GTOC_PICKER__/g, skipGtocPicker ? '' : buildNavigation(nav))
    .replace('__ALTDOCS__', buildVersions(path, added, config.changelog))
    .replace(
      '__EDIT_ON_GITHUB__',
      skipGitHub
        ? ''
        : buildGitHub(populate(config.editURL, { ...config, path }))
    );
};
