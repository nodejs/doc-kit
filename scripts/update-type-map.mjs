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
};

writeFile(
  './src/generators/metadata/maps/mdn.json',
  JSON.stringify(map, null, 2) + '\n'
);
