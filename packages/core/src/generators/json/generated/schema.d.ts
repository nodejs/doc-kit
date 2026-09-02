/* eslint-disable */
/**
 * Generated from `schema.json` by `scripts/generate-json-types.mjs`.
 * Do not edit: change the schema and regenerate instead.
 */

/**
 * One API documentation source file, as emitted by the doc-kit `json` generator. The file is the root of a tree of nodes, one per heading, in document order.
 */
export type Document = Entry & {
  /**
   * The URL of the schema this document conforms to. Its last path segment is the schema version.
   */
  $schema: string;
  /**
   * The document's identifier: its path, slugged. Unique within a documentation set.
   */
  id: string;
  /**
   * The document's path inside the input tree, without extension. Cross-document links target `<path>.html`.
   */
  path: string;
  /**
   * The document's declared type: a module reference, a miscellaneous (conceptual) page, or a page of globals.
   */
  type: 'module' | 'misc' | 'global';
  /**
   * The name of the module the document describes, when it describes one.
   */
  module: string | null;
  /**
   * The version the document itself was introduced in.
   */
  introducedIn: string | null;
  /**
   * The implementation the document describes, when it links to one.
   */
  sourceLink: SourceLink | null;
  /**
   * The document's headings, nested by depth, in document order.
   */
  children: Node[];
};
/**
 * A version string as authored, such as `v18.0.0`, or a release-process placeholder such as `REPLACEME`.
 */
export type Version = string;
/**
 * A heading below the document root.
 */
export type Node = SectionNode | ClassNode | ConstructorNode | MethodNode | StaticMethodNode | PropertyNode | EventNode;
/**
 * A heading that documents no API entry: prose, a deprecation, a command-line option.
 */
export type SectionNode = Entry &
  NodeBase & {
    kind: 'section';
  };
/**
 * A class. Its constructors, methods, properties and events are its children.
 */
export type ClassNode = Entry &
  NodeBase & {
    kind: 'class';
    /**
     * The class the class extends, when documented.
     */
    extends: Type | null;
  };
/**
 * A class constructor.
 */
export type ConstructorNode = Entry &
  NodeBase & {
    kind: 'constructor';
    signature: Signature;
  };
/**
 * A function or method.
 */
export type MethodNode = Entry &
  NodeBase & {
    kind: 'method';
    signature: Signature;
  };
/**
 * A static method of a class.
 */
export type StaticMethodNode = Entry &
  NodeBase & {
    kind: 'staticMethod';
    signature: Signature;
  };
/**
 * A property of a module, class or object.
 */
export type PropertyNode = Entry &
  NodeBase & {
    kind: 'property';
    /**
     * The property's type, when documented.
     */
    type: Type | null;
    /**
     * The property's default value as authored, when documented.
     */
    default: string | null;
  };
/**
 * An event emitted by the parent class or module.
 */
export type EventNode = Entry &
  NodeBase & {
    kind: 'event';
    /**
     * The arguments passed to the event's listeners.
     */
    parameters: Parameter[];
  };

/**
 * What every heading, the document's own included, carries: its metadata and its body.
 */
export interface Entry {
  /**
   * The heading text as authored, inline Markdown included.
   */
  title: string;
  /**
   * The entry's stability index, when declared.
   */
  stability: Stability | null;
  /**
   * The versions the entry was added in, as authored.
   */
  added: Version[];
  /**
   * The versions the entry was deprecated in.
   */
  deprecated: Version[];
  /**
   * The versions the entry was removed in.
   */
  removed: Version[];
  /**
   * The Node-API versions the entry is available in.
   */
  napiVersion: number[];
  /**
   * The entry's change history, as authored.
   */
  changes: Change[];
  /**
   * The entry's body as Markdown: everything under the heading except its metadata, stability index, and the typed list a signature or type was taken from. Empty when the entry has no body.
   */
  description: string;
  /**
   * A one-paragraph plain-text summary: the entry's `llm_description` when declared, else its first paragraph.
   */
  summary: string;
  /**
   * The fenced code blocks in the body, in order. They remain in the description too.
   */
  examples: Example[];
}
/**
 * An entry's stability index.
 */
export interface Stability {
  /**
   * The index as authored, including any sub-level, such as `1.1`.
   */
  index: string;
  /**
   * The text following the index, as Markdown.
   */
  description: string;
}
/**
 * One record of an entry's change history.
 */
export interface Change {
  /**
   * The versions the change shipped in.
   */
  versions: Version[];
  /**
   * The pull request that made the change.
   */
  prUrl: string | null;
  /**
   * The commit that made the change, on records that predate pull requests.
   */
  commit: string | null;
  /**
   * What changed, as Markdown.
   */
  description: string;
}
/**
 * A fenced code block from an entry's body.
 */
export interface Example {
  /**
   * The code block's language identifier.
   */
  language: string | null;
  /**
   * The code block's `displayName` attribute.
   */
  displayName: string | null;
  /**
   * The code.
   */
  code: string;
}
/**
 * A link to the implementation a document describes.
 */
export interface SourceLink {
  /**
   * The implementation's path, relative to the repository root, as authored.
   */
  path: string;
  /**
   * The implementation's URL, when a repository is configured.
   */
  url: string | null;
}
/**
 * What every node below the document root carries, on top of an entry.
 */
export interface NodeBase {
  /**
   * What the heading documents. Decides which further properties the node has.
   */
  kind: 'section' | 'class' | 'constructor' | 'method' | 'staticMethod' | 'property' | 'event';
  /**
   * The heading's slug, unique within the document. It is the heading's anchor in HTML output.
   */
  id: string;
  /**
   * The bare identifier the heading documents, or the heading's plain text for a section.
   */
  name: string;
  /**
   * Whether the entry is reached through its module, or available globally.
   */
  scope: 'module' | 'global';
  /**
   * For the second and later of several sibling headings documenting one callable, the `id` of the first.
   */
  overloadOf: string | null;
  /**
   * The headings nested under this one, in document order.
   */
  children: Node[];
}
/**
 * A type annotation.
 */
export interface Type {
  /**
   * The annotation as a TypeScript type expression, normalised: single-line, union members separated by ` | `.
   */
  text: string;
  /**
   * The resolved names in the text, by offset, non-overlapping.
   */
  links: TypeLink[];
}
/**
 * A type name inside a type's text, resolved to documentation.
 */
export interface TypeLink {
  /**
   * The resolved name, exactly as it appears in the text.
   */
  name: string;
  /**
   * Where the name is documented: a URL, or a link relative to the document.
   */
  href: string;
  /**
   * The offset of the name's first character in the text.
   */
  start: number;
  /**
   * The offset after the name's last character in the text.
   */
  end: number;
}
/**
 * A callable's signature: the parameters declared in its heading, described by its typed list.
 */
export interface Signature {
  /**
   * The parameters, in declaration order.
   */
  parameters: Parameter[];
  /**
   * The return value, when documented.
   */
  returns: Return | null;
}
/**
 * A parameter of a signature or event, or a property of an object parameter.
 */
export interface Parameter {
  /**
   * The parameter's name, without any rest marker.
   */
  name: string;
  /**
   * The parameter's type, when documented.
   */
  type: Type | null;
  /**
   * The parameter's description, as Markdown, without its default value.
   */
  description: string;
  /**
   * The default value as authored, such as `'utf8'` or `false`.
   */
  default: string | null;
  /**
   * Whether the parameter may be omitted: bracketed in the signature, or documented with a default.
   */
  optional: boolean;
  /**
   * Whether the parameter is a rest parameter.
   */
  rest: boolean;
  /**
   * The documented properties of an object parameter, or the arguments of a callback.
   */
  properties: Parameter[];
}
/**
 * A signature's return value.
 */
export interface Return {
  /**
   * The return type, when documented.
   */
  type: Type | null;
  /**
   * The return value's description, as Markdown.
   */
  description: string;
}
