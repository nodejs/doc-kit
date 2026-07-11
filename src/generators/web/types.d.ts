import type { BundleAsyncOptions, CustomAtRules } from 'lightningcss-wasm';
import type { BuildOptions } from 'rolldown';

import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';

// An attribute bag rendered into an HTML tag. `true` becomes a valueless
// attribute (e.g. `crossorigin`); `false`/`null`/`undefined` are omitted.
export type TagAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

// Describes how a JSX component is imported. Mirrors the `JSXImportConfig`
// JSDoc typedef in `constants.mjs`.
export type JSXImportConfig = {
  name: string;
  source: string;
  isDefaultExport?: boolean;
};

export type HeadConfig = {
  // `<meta>` tags, each an attribute bag (e.g. `{ name, content }`).
  meta: Array<TagAttributes>;
  // `<link>` tags, each an attribute bag (e.g. `{ rel, href, crossorigin }`).
  links: Array<TagAttributes>;
  // Arbitrary raw HTML appended to the document head.
  html: Array<string>;
};

export type Configuration = {
  templatePath: string;
  title: string;
  useAbsoluteURLs: boolean;
  showSearchBar?: boolean;
  head: HeadConfig;
  // Options spread into LightningCSS while bundling CSS. `filename`, `code`,
  // `cssModules`, and `resolver` are managed by the generator and ignored here.
  lightningcss: Partial<
    Omit<
      BundleAsyncOptions<CustomAtRules>,
      'filename' | 'code' | 'cssModules' | 'resolver'
    >
  >;
  imports: Record<string, string>;
  virtualImports: Record<string, string>;
  // Maps a JSX tag name to its import, enabling JSX-in-MDX. The string shorthand
  // `Tag: 'source'` expands to `{ name: Tag, source }`. Merged with the built-in
  // `JSX_IMPORTS`. Pair each entry with a matching `imports` alias to resolve the
  // `source` to a real module path.
  components: Record<string, JSXImportConfig | string>;
  // Options merged into the Rolldown build for the client and server bundles.
  // See the web generator README for the merge semantics.
  rolldown: Partial<BuildOptions>;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<JSXContent>, Promise<Array<{ html: string; css: string }>>>
>;
