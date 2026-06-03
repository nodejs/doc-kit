import type { BundleAsyncOptions, CustomAtRules } from 'lightningcss-wasm';

import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';

// An attribute bag rendered into an HTML tag. `true` becomes a valueless
// attribute (e.g. `crossorigin`); `false`/`null`/`undefined` are omitted.
export type TagAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

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
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<JSXContent>, Promise<Array<{ html: string; css: string }>>>
>;
