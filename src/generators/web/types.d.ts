import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';
import type { GlobalConfiguration } from '../../utils/configuration/types';

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

export type ResolvedWebConfiguration = Configuration & GlobalConfiguration;

export type ServerBundleOptions = {
  // Server-side JSX programs keyed by `${api}.jsx`.
  entries: Map<string, string>;
  // In-memory modules that the bundler must make available to the entries.
  virtualImports: Record<string, string>;
  config: ResolvedWebConfiguration;
};

export type ClientBundleOptions = {
  // Client-side JSX programs keyed by `${api}.jsx`.
  entries: Map<string, string>;
  // In-memory modules that the bundler must make available to the entries.
  virtualImports: Record<string, string>;
  // Populated HTML keyed by its output-relative file name.
  pages: Map<string, string>;
  config: ResolvedWebConfiguration;
};

export type WebBundler = {
  // Returns the module identifier embedded in one page's client script tag.
  getEntryId(api: string): string;
  // Returns rendered HTML keyed by API name.
  render(options: ServerBundleOptions): Promise<Map<string, string>>;
  // Bundles the client entries and writes the complete site.
  build(options: ClientBundleOptions): Promise<void>;
};

export type Configuration = {
  templatePath: string;
  title: string;
  useAbsoluteURLs: boolean;
  head: HeadConfig;
  imports: Record<string, string>;
  virtualImports: Record<string, string>;
  // Maps a JSX tag name to its import, enabling JSX-in-MDX. The string shorthand
  // `Tag: 'source'` expands to `{ name: Tag, source }`. Merged with the built-in
  // `JSX_IMPORTS`. Pair each entry with a matching `imports` alias to resolve the
  // `source` to a real module path.
  components: Record<string, JSXImportConfig | string>;
  // Optional bundler adapter. When omitted, the Vite adapter is loaded lazily.
  bundler?: WebBundler;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<JSXContent>, Promise<void>>
>;
