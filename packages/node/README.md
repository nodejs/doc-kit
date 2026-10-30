# `@node-core/doc-kit`

The Node.js-specific parts of [doc-kit](https://doc-kit.nodejs.org): three
generators for outputs only the Node.js project needs (its man page,
`apilinks.json` and its addon example tests), and `@node-core/doc-kit/config`,
a preset that configures the general-purpose generators the way nodejs.org builds its
API documentation.

Use it to build the Node.js API documentation, or documentation shaped like
it. Other projects don't need it: doc-kit's defaults are project-neutral, so
start from [Getting started](https://doc-kit.nodejs.org/getting-started).

## Install

```sh
npm install --save-dev @doc-kit/cli @node-core/doc-kit
```

That covers the three generators. To build the website, the search index,
`llms.txt` or the sitemap with the preset, also install the generators that
make them:

```sh
npm install --save-dev @doc-kit/generator-react
```

## Generators

| Target                                                               | Input in Node.js    | Output                                                                                                               |
| -------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`man-page`](https://doc-kit.nodejs.org/generators/man-page)         | `doc/api/cli.md`    | `node.1`, the `node` man page in mdoc format, with the options and environment variables that `cli.md` documents     |
| [`api-links`](https://doc-kit.nodejs.org/generators/api-links)       | `lib/*.js`          | `apilinks.json`, which maps each API (such as `buffer.Buffer`) to the line on GitHub that defines it                 |
| [`addon-verify`](https://doc-kit.nodejs.org/generators/addon-verify) | `doc/api/addons.md` | A folder per addon example (such as `02_function_arguments/`), with its C++ and JavaScript files and a `binding.gyp` |

## Usage

```sh
npx @doc-kit/cli generate -t man-page -i "doc/api/cli.md" -o out
```

## The Node.js preset

`@node-core/doc-kit/config` gives the project-neutral generators Node.js
branding, URL layouts and release history. Extend it from your configuration
file:

```mjs displayName="doc-kit.config.mjs"
export default {
  extends: '@node-core/doc-kit/config',

  target: ['html', 'orama-db'],
  global: {
    input: ['doc/api/*.md'],
    output: 'out',
  },
};
```

The preset doesn't choose targets or inputs. It sets these options:

| Option                                      | Value                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `global.project`                            | `Node.js`                                                                                  |
| `global.repository`, `global.ref`           | `nodejs/node`, `HEAD`                                                                      |
| `global.baseURL`                            | `https://nodejs.org/docs`                                                                  |
| `global.changelog`                          | `https://raw.githubusercontent.com/nodejs/node/HEAD/CHANGELOG.md`, the release history     |
| `html.editURL`                              | `https://github.com/{repository}/edit/{ref}/doc/api{path}.md`                              |
| `html.pageURL`                              | `{baseURL}/latest-{version}/api{path}.html`                                                |
| `html.remoteConfigUrl`                      | `https://nodejs.org/site.json`, which the browser fetches for banners and the release list |
| `html.head`                                 | The Node.js description, Open Graph tags and favicon                                       |
| `html.stylesheets`                          | A theme with the Node.js green brand colors                                                |
| `html.imports`                              | The Node.js logo as `#theme/Logo`                                                          |
| `llms-txt.templatePath`, `llms-txt.pageURL` | A Node.js llms.txt header, and `{baseURL}/latest/api{path}.md`                             |
| `sitemap.indexURL`, `sitemap.pageURL`       | `{baseURL}/latest/api/`, `{baseURL}/latest/api{path}.html`                                 |

See [Website](https://doc-kit.nodejs.org/generators/html),
[llms.txt](https://doc-kit.nodejs.org/generators/llms-txt) and
[Sitemap](https://doc-kit.nodejs.org/generators/sitemap) for what each option
does.

> [!TIP]
> With the preset, every run downloads the release history from GitHub. To
> build offline, pass a local copy instead, such as `--changelog CHANGELOG.md`
> from the root of a Node.js checkout.

### Overriding the preset

Your configuration file wins over the preset. Objects merge key by key, but an
array you set (such as `html.stylesheets` or `html.head.meta`) replaces the
preset's instead of adding to it (see
[Precedence](https://doc-kit.nodejs.org/configuration#precedence)). To keep the
Node.js theme and add a stylesheet of your own, spread the preset's value:

```mjs displayName="doc-kit.config.mjs"
import { join } from 'node:path';

import preset from '@node-core/doc-kit/config';

export default {
  extends: '@node-core/doc-kit/config',

  html: {
    stylesheets: [
      ...preset.html.stylesheets,
      join(import.meta.dirname, 'extra.css'),
    ],
  },
};
```
