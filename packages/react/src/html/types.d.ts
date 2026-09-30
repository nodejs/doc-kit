import type { PageCode } from '../jsx-ast/types';
import type { GlobalConfiguration } from '@doc-kit/core/utils/configuration/types';
import type SideBar from '@node-core/ui-components/Containers/Sidebar';
import type NavBar from '@node-core/ui-components/Containers/NavBar';
import type { ComponentProps } from 'preact';

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

// A page assembled from other pages' content (`all.html`): `parts` lists the
// `api`s whose compiled programs it imports, in order.
export type ComposedPage = Omit<PageCode, 'content' | 'readingTime'> & {
  parts: Array<string>;
};

// What the generator turns into a page program.
export type Page = PageCode | ComposedPage;

// A compiled page program, ready for a worker to import and render, with the
// data the layout is rendered with.
export type PageTask = Pick<PageCode, 'data' | 'headings' | 'readingTime'> & {
  // `file:` URL of the compiled module.
  moduleURL: string;
};

// The client assets every page loads, as paths relative to the output root.
export type ClientAssets = {
  // Module scripts, in load order.
  scripts: Array<string>;
  // Chunks the scripts statically import, to preload.
  preloads: Array<string>;
  // Stylesheets.
  stylesheets: Array<string>;
};

export type ServerBundleOptions = {
  // The component library's source: re-exports of every component, the JSX
  // runtime (`h`, `Fragment`) and `renderToStringAsync`.
  entry: string;
  // In-memory modules that the bundler must make available to the entry.
  virtualImports: Record<string, string>;
  // Where to write the built library.
  outDir: string;
  config: ResolvedWebConfiguration;
};

export type ClientBundleOptions = {
  // The client-side program every page loads, hydrating its server-rendered
  // markup.
  entry: string;
  // In-memory modules that the bundler must make available to the entry.
  virtualImports: Record<string, string>;
  config: ResolvedWebConfiguration;
};

export type WebBundler = {
  // Bundles the component library for Node and returns the `file:` URL of the
  // built module. Page programs import from it.
  buildServer(options: ServerBundleOptions): Promise<string>;
  // Turns one page program — a module using JSX — into plain JavaScript Node
  // can import. JSX must compile to calls of the `_jsx` and `_Fragment`
  // bindings the program imports (the classic runtime; see `JSX_PRAGMA`).
  compile(code: string, fileName: string): Promise<string>;
  // Bundles the client entry into `config.output` and returns the assets every
  // page must load.
  buildClient(options: ClientBundleOptions): Promise<ClientAssets>;
};

export type Configuration = {
  templatePath: string;
  title: string;
  useAbsoluteURLs: boolean;
  head: HeadConfig;
  // Paths to extra stylesheets
  stylesheets: Array<string>;
  imports: Record<string, string>;
  virtualImports: Record<string, string>;
  // Maps a JSX tag name to its import, enabling JSX-in-MDX. The string shorthand
  // `Tag: 'source'` expands to `{ name: Tag, source }`. Merged with the built-in
  // `JSX_IMPORTS`. Pair each entry with a matching `imports` alias to resolve the
  // `source` to a real module path.
  components: Record<string, JSXImportConfig | string>;
  // Sidebar groups and navigation-bar items. Both keys are optional; omitting
  // one keeps that component's default. Sidebar links are page paths resolved
  // per page (absolute URLs pass through); navigation-bar links are verbatim.
  navigation: {
    sidebar?: ComponentProps<typeof SideBar>['groups'];
    navbar?: ComponentProps<typeof NavBar>['navItems'];
    showCrossLinks?: boolean;
  };
  // Whether to write `all.html`, every module page's content on one page.
  generateAllPage: boolean;
  // Optional bundler adapter. When omitted, the Vite adapter is loaded lazily.
  bundler?: WebBundler;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<PageCode>, Promise<void>>,
  ProcessChunk<PageTask, string, { template: string; assets: ClientAssets }>
>;
