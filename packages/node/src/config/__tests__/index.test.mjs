import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

import preset from '../index.mjs';

describe('Node.js preset', () => {
  it('should brand the generators for nodejs.org', () => {
    assert.equal(preset.global.project, 'Node.js');
    assert.equal(preset.global.repository, 'nodejs/node');
    assert.equal(preset.global.baseURL, 'https://nodejs.org/docs');
    assert.match(preset.global.changelog, /nodejs\/node/);

    assert.equal(preset.html.remoteConfigUrl, 'https://nodejs.org/site.json');
    assert.equal(
      preset.html.imports['#theme/Logo'],
      '@node-core/ui-components/Common/NodejsLogo'
    );
    assert.ok(preset.html.editURL.includes('/doc/api{path}.md'));
  });

  it('should ship the Node.js llms.txt template', () => {
    assert.ok(existsSync(preset['llms-txt'].templatePath));
  });
});
