import { OptionDefaults, ReflectionKind } from 'typedoc';

/** The kinds of exports with a page of their own */
export const PAGE_KINDS =
  ReflectionKind.Function |
  ReflectionKind.Interface |
  ReflectionKind.TypeAlias |
  ReflectionKind.Class |
  ReflectionKind.Variable;

/** The kinds of exports the type map leaves out: they are no types */
export const VALUE_KINDS = ReflectionKind.Function | ReflectionKind.Variable;

/** TypeDoc's default member groups; other groups come from `@group` */
export const DEFAULT_GROUPS = new Set([
  'Properties',
  'Methods',
  'Accessors',
  'Constructors',
]);

/** Block tags TypeDoc knows of; others are the project's own (`@kind`) */
export const STANDARD_TAGS = new Set(OptionDefaults.blockTags);

/** Return types that get no `Returns:` item */
export const VOID_TYPES = new Set(['void', 'undefined']);

/** The `kind` of member pages in the page list */
export const MEMBER_PAGE_KIND = 'Member';

/** The type map, for doc-kit's `typeMap` to link `{Type}` annotations with */
export const TYPE_MAP_FILE = 'type-map.json';

/** The page list, for the site to build its navigation from */
export const PAGE_LIST_FILE = 'pages.json';
