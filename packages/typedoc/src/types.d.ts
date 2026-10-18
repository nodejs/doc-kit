import type { Application, Reflection } from 'typedoc';

import type { DocKitRouter } from './utils/router.mjs';

declare module 'typedoc' {
  export interface TypeDocOptionMap {
    /** Where to write the reference (`docs/api`) */
    docKit: string;
    /** Where the output directory is under doc-kit's input directory (`api`) */
    docKitBasePath: string;
    /** The type map's file name, or `''` to leave it out */
    docKitTypeMap: string;
    /** The page list's file name, or `''` to leave it out */
    docKitPageList: string;
    /** Types whose members each have a page of their own (`InputOptions`) */
    docKitMemberPages: string[];
    /** Adapts each page's URL: `interfaces/Plugin` → `Interface.Plugin` */
    docKitUrlAdapter?: (url: string, reflection: Reflection) => string;
    /** The name members are documented on, by type name */
    docKitReceivers: Record<string, string>;
  }
}

/** What renderers work with */
export interface Context {
  app: Application;
  router: DocKitRouter;
  /** The page being rendered, which links are relative to */
  page: Reflection;
  /** The other entry points exporting declarations the main one does not */
  exportedFrom: Map<Reflection, string[]>;
}

/** A page of the reference, as listed in the page list */
export interface PageEntry {
  /** The reflection's full name (`optimize.SplitChunksPlugin`) */
  name: string;
  /** The reflection's kind (`Class`) */
  kind: string;
  url: string;
  category?: string;
}
