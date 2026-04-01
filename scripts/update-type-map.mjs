import { writeFile } from 'node:fs/promises';

import { MDN_COMPAT_URL, MDN_TYPE_MAP } from './constants.mjs';
import { loadFromURL } from '../src/utils/loaders.mjs';

const compat = JSON.parse(await loadFromURL(MDN_COMPAT_URL));

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

writeFile(MDN_TYPE_MAP, JSON.stringify(map, null, 2));
