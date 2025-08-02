import type { Heading, Root } from 'mdast';
import type { Program } from 'acorn';
import type { SemVer } from 'semver';
import type { Data, Node, Parent, Position } from 'unist';

// Unist Node with typed Data, which allows better type inference
type NodeWithData<T extends Node, J extends Data> = T & {
  data: J;
};

declare global {
  export interface ParserOutput<T> {
    file: {
      stem?: string;
      basename?: string;
    };
    tree: T;
  }

  export interface StabilityIndexMetadataEntry {
    index: string;
    description: string;
  }

  export interface StabilityIndexParent extends Parent {
    children: Array<NodeWithData<Root, StabilityIndexMetadataEntry>>;
  }

  export interface HeadingMetadataEntry {
    type:
      | 'event'
      | 'global'
      | 'method'
      | 'property'
      | 'class'
      | 'module'
      | 'classMethod'
      | 'ctor';
    text: string;
    name: string;
    depth: number;
    slug: string;
  }

  export interface HeadingMetadataParent
    extends NodeWithData<Heading, HeadingMetadataEntry> {}

  export interface ApiDocMetadataChange {
    // The Node.js version or versions where said change was introduced simultaneously
    version: string | Array<string>;
    // The GitHub PR URL of said change
    'pr-url': string | undefined;
    // The description of said change
    description: string;
  }

  export interface ApiDocRawMetadataEntry {
    type?: string;
    name?: string;
    source_link?: string;
    changes?: Array<ApiDocMetadataChange>;
    added?: string;
    removed?: string;
    deprecated?: string;
    introduced_in?: string;
    napiVersion?: number;
    tags?: Array<string>;
    llm_description?: string;
  }

  export interface ApiDocMetadataEntry {
    // The name of the API doc file without the file extension (basename)
    api: string;
    // The unique slug of a Heading/Navigation entry which is linkable through an anchor
    slug: string;
    // The GitHub URL to the source of the API entry
    source_link: string | Array<string> | undefined;
    // Path to the api doc file relative to the root of the nodejs repo root (ex/ `doc/api/addons.md`)
    api_doc_source: string;
    // When a said API section got added (in which version(s) of Node.js)
    added_in: string | Array<string> | undefined;
    // When a said API section got removed (in which version(s) of Node.js)
    removed_in: string | Array<string> | undefined;
    // When a said API section got deprecated (in which version(s) of Node.js)
    deprecated_in: string | Array<string> | undefined;
    // This is usually used for the head API section in the beginning of an API doc
    // to indicate in which version this page got added to the Node.js API docs
    introduced_in: string | Array<string> | undefined;
    // If the API section is covered by N-API versioning
    // this field will show its related minimum N-API version
    n_api_version: number | undefined;
    // Any changes to the API doc Metadata
    changes: Array<ApiDocMetadataChange>;
    // The parsed Markdown content of a Navigation Entry
    heading: HeadingMetadataParent;
    // The API doc metadata Entry Stability Index if exists
    stability: StabilityIndexParent;
    // The subtree containing all Nodes of the API doc entry
    content: Root;
    // Extra YAML section entries that are stringd and serve
    // to provide additional metadata about the API doc entry
    tags: Array<string>;
    // The llms.txt specific description
    llm_description: string | undefined;
    // The postion of the YAML of the API doc entry
    yaml_position: Position;
  }

  export interface JsProgram extends Program {
    // Path to the program's source (i.e. `../node/lib/zlib.js`)
    path: string;
  }

  export interface ApiDocReleaseEntry {
    version: SemVer;
    isLts: boolean;
    isCurrent: boolean;
  }
}
