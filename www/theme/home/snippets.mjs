import { schemaVersion } from '#theme/site';

// The code on the home page. The outputs are excerpts of what doc-kit made of
// the Markdown: fields are left out, and `…` marks what's cut short.

export const KITTENS_MD = `
# Kittens

<!--introduced_in=v1.0.0-->

The \`kittens\` module adopts, feeds, and pets kittens.

## \`kittens.adopt(name[, options])\`

<!-- YAML
added: v1.0.0
changes:
  - version: v2.0.0
    pr-url: https://github.com/acme/kittens/pull/42
    description: Returns a promise.
-->

> Stability: 1 - Experimental

- \`name\` {string} The kitten's name.
- \`options\` {Object}
  - \`color\` {string} Coat color. **Default:** \`'tabby'\`.
  - \`signal\` {AbortSignal} Cancels the adoption.
- Returns: {Promise} Fulfills with the adopted kitten.

Adopts a kitten, once the paperwork is done.
`;

export const KITTENS_TS = `
/**
 * Adopts a kitten, once the paperwork is done.
 *
 * @param name - The kitten's name.
 * @param options.color - Coat color.
 * @param options.signal - Cancels the adoption.
 * @returns The adopted kitten.
 * @experimental
 */
export async function adopt(
  name: string,
  options: { color?: string; signal?: AbortSignal } = {}
): Promise<Kitten> {
  // …
}
`;

export const KITTENS_JS = `
/**
 * Adopts a kitten, once the paperwork is done.
 *
 * @param {string} name The kitten's name.
 * @param {object} [options]
 * @param {string} [options.color] Coat color.
 * @param {AbortSignal} [options.signal] Cancels the adoption.
 * @returns {Promise<Kitten>} The adopted kitten.
 * @experimental
 */
export async function adopt(name, options = {}) {
  // …
}
`;

export const KITTENS_JSON = `
{
  "$schema": "https://doc-kit.nodejs.org/schemas/api-doc/${schemaVersion}.json",
  "id": "kittens",
  "type": "module",
  "title": "Kittens",
  "introducedIn": "v1.0.0",
  "children": [
    {
      "kind": "method",
      "name": "adopt",
      "stability": { "index": "1", "description": "Experimental" },
      "added": ["v1.0.0"],
      "changes": [
        {
          "versions": ["v2.0.0"],
          "prUrl": "https://github.com/acme/kittens/pull/42",
          "description": "Returns a promise."
        }
      ],
      "signature": {
        "parameters": [
          {
            "name": "name",
            "type": {
              "text": "string",
              "links": [{ "name": "string", "href": "https://developer.mozilla.org/…" }]
            },
            "description": "The kitten's name.",
            "optional": false
          },
          { "name": "options", "optional": true, "properties": [ … ] }
        ],
        "returns": {
          "type": { "text": "Promise", "links": [ … ] },
          "description": "Fulfills with the adopted kitten."
        }
      }
    }
  ]
}
`;

export const KITTENS_LLMS = `
# Kittens Documentation

> API documentation for Kittens.

…

## API Documentations
- [Kittens](https://kittens.dev/kittens.md): The \`kittens\` module adopts, feeds, and pets kittens.
`;

export const KITTENS_SEARCH = `
{
  "title": "adopt",
  "description": "Adopts a kitten, once the paperwork is done.",
  "href": "/kittens.html#kittensadoptname-options",
  "siteSection": "Kittens"
}
`;

export const STEP_WRITE = `
# Kittens

The \`kittens\` module adopts, feeds, and pets kittens.

## \`kittens.pet(kitten[, times])\`

- \`kitten\` {Kitten} The kitten to pet.
- \`times\` {number} **Default:** \`1\`.
- Returns: {boolean} Whether it purred.
`;

export const STEP_BUILD = `
$ npx doc-kit generate -t html -t orama-db -i "docs/*.md" -o out
$ npx serve out
`;
