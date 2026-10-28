'use strict';

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import { replaceTemplateValues } from '../replaceTemplateValues.mjs';

describe('replaceTemplateValues', () => {
  before(() => setConfig({}));

  const baseValues = {
    path: '/test',
    api: 'test',
    added: undefined,
    section: 'section',
    toc: [],
    nav: 'nav',
    content: 'content',
  };

  const config = { version: { version: '1.0.0' }, changelog: [] };

  it('does not treat `$$`, `$&`, "$`" and `$\'` in content as replacement patterns', () => {
    const template = '<main>__CONTENT__</main><nav>__GTOC__</nav>';

    const dollarContent = 'dirname "$$(command -v node)" $& $` $\'';

    const output = replaceTemplateValues(
      template,
      { ...baseValues, content: dollarContent },
      config,
      { skipGitHub: true }
    );

    assert.match(
      output,
      /<main>dirname "\$\$\(command -v node\)" \$& \$` \$'<\/main>/
    );
  });

  it('does not treat `$$`, `$&`, "$`" and `$\'` in nav as replacement patterns', () => {
    const template = '<main>__CONTENT__</main><nav>__GTOC__</nav>';

    const dollarNav = "nav $$ $& $` $'";

    const output = replaceTemplateValues(
      template,
      { ...baseValues, nav: dollarNav },
      config,
      { skipGitHub: true }
    );

    assert.match(output, /<nav>nav \$\$ \$& \$` \$'<\/nav>/);
  });
});
