import { writeFile } from 'node:fs/promises';

import { loadFromURL } from '../src/utils/url.mjs';

const compat = JSON.parse(
  await loadFromURL(
    'https://github.com/mdn/browser-compat-data/releases/latest/download/data.json'
  )
);

const creatingMapping = obj =>
  Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => [k.toLowerCase(), v.__compat.mdn_url])
      .filter(([, v]) => v)
  );

const map = {
  ...creatingMapping(compat.api),
  ...creatingMapping(compat.javascript.builtins),

  //   TSC39 objects
  asynciterable: 'https://tc39.github.io/ecma262/#sec-asynciterable-interface',
  'module namespace object':
    'https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects',

  // Data structures
  ...Object.fromEntries(
    [
      'null',
      'undefined',
      'boolean',
      'number',
      'bigint',
      'string',
      'symbol',
    ].map(k => [
      k,
      `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures/${k}`,
    ])
  ),
  integer:
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures/number',
  any: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures/#Data_types',
  this: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
};

writeFile(
  './src/generators/metadata/typeMap.json',
  JSON.stringify(map, null, 2) + '\n'
);
