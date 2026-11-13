import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { withCodSpeed } from '@codspeed/tinybench-plugin';
import createGenerator from '@doc-kit/core';
import logger from '@doc-kit/core/logger/index.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { Bench } from 'tinybench';

logger.setLogLevel('warn');

const node = path.join(import.meta.dirname, '../node');
const at = (...parts) => path.join(node, ...parts);

const shared = {
  threads: 1,
  index: at('doc/api/index.md'),
  typeMap: at('doc/type-map.json'),
  changelog: at('CHANGELOG.md'),
};

const docs = at('doc/api/*.md');

const targets = [
  ['json', docs],
  ['json-simple', docs],
  ['legacy-json', docs],
  ['legacy-html', docs],
  ['html', docs],
  ['llms-txt', docs],
  ['orama-db', docs],
  ['man-page', at('doc/api/cli.md')],
  ['addon-verify', at('doc/api/addons.md')],
  ['api-links', at('lib/*.js')],
];

const bench = withCodSpeed(
  new Bench({ warmup: false, iterations: 1, time: 0, throws: true })
);

for (const [name, input] of targets) {
  const output = path.join(import.meta.dirname, '../out', name);
  let runGenerators;
  let config;

  bench.add(name, () => runGenerators(config), {
    beforeAll: async () => {
      await rm(output, { recursive: true, force: true });
      await mkdir(output, { recursive: true });
      ({ runGenerators } = createGenerator());
      config = await setConfig({
        ...shared,
        target: [name],
        input: [input],
        output,
      });
    },
    afterAll: () => rm(output, { recursive: true, force: true }),
  });
}

await bench.run();

if (process.env.CODSPEED_ENV === undefined) {
  console.table(bench.table());
}
