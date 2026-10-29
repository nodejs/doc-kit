'use strict';

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import { replaceTemplateValues } from '../replaceTemplateValues.mjs';

const template = '<main>__CONTENT__</main><nav>__GTOC__</nav>';

const config = { version: { version: '1.0.0' }, changelog: [] };

const createValues = overrides => ({
  path: '/deprecations',
  api: 'deprecations',
  added: 'v1.0.0',
  section: 'Deprecations',
  toc: '',
  nav: '',
  content: '',
  ...overrides,
});

describe('replaceTemplateValues', () => {
  before(() => setConfig({}));

  it('inserts content containing `$$` as-is', () => {
    const content = 'dirname "$$(command -v node)"';

    const output = replaceTemplateValues(
      template,
      createValues({ content }),
      config,
      { skipGitHub: true }
    );

    assert.strictEqual(output, `<main>${content}</main><nav></nav>`);
  });

  it("inserts content containing `$&`, `$'` and `` $` `` as-is", () => {
    const content = "x $& y $' z $` w";

    const output = replaceTemplateValues(
      template,
      createValues({ content }),
      config,
      { skipGitHub: true }
    );

    assert.strictEqual(output, `<main>${content}</main><nav></nav>`);
  });

  it('inserts nav containing `$` sequences as-is', () => {
    const nav = "<a href='$&'>$'</a>";

    const output = replaceTemplateValues(
      template,
      createValues({ nav }),
      config,
      { skipGitHub: true }
    );

    assert.strictEqual(output, `<main></main><nav>${nav}</nav>`);
  });
});
