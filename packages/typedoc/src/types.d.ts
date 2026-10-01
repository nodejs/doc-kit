import type { DeclarationReflection, Reflection } from 'typedoc';

export interface Options {
  /** The URL path the pages are served under (`/reference`) */
  docKitBasePath: string;
  /** The URL of the site (`https://rolldown.rs`) */
  docKitSiteUrl: string;
  /** Types whose members each have a page of their own (`InputOptions`) */
  docKitMemberPages: string[];
  /** The name members of a type are documented on, by type name */
  docKitReceivers: Record<string, string>;
  /** Event emitters, mapped to the type mapping their events to their arguments */
  docKitEvents: Record<string, string>;
  /** Types whose members take their signatures from another type's members */
  docKitSignatureSources: Record<string, string>;
  /** The import path of each entry point, by file */
  docKitImportPaths: Record<string, string>;
  /** Whether members get an anchor of their name alone */
  docKitMemberAnchors: boolean;
}

export interface Model {
  /** The declarations with a page, sorted by name */
  declarations: DeclarationReflection[];
  /** Page file names (without extension), by reflection */
  pages: Map<Reflection, string>;
  /** The members with a page of their own, by the name of their type */
  memberPages: Map<string, DeclarationReflection[]>;
  /** Types documented on the page of the one member using them */
  inlined: Map<DeclarationReflection, DeclarationReflection>;
  /** Declarations by name */
  byName: Map<string, DeclarationReflection>;
  /** The import paths each declaration is exported from */
  importPaths: Map<Reflection, Set<string>>;
  /** The `@category` of each declaration */
  categories: Map<Reflection, string>;
  /** The URL of a reflection, or of the closest parent with one */
  url(reflection: Reflection | undefined): string | undefined;
  /** The member with a page of its own a member is, or inherits */
  memberPageOf(
    member: DeclarationReflection
  ): DeclarationReflection | undefined;
}

/** A page of the reference, as listed in `pages.json` */
export interface PageEntry {
  name: string;
  /** The kind of the declaration (`Function`), or `Member` for a member page */
  kind: string;
  url: string;
  category?: string;
  /** The type a member page belongs to */
  owner?: string;
  /** Whether the page only refers to the member page documenting the type */
  inlined?: boolean;
}
