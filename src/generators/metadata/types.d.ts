import type { Root, Position, Node, Data, Blockquote, Heading } from 'mdast';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<Root>, AsyncGenerator<MetadataEntry>>,
  ProcessChunk<Root, MetadataEntry, Record<string, string>>
>;

/**
 * Utility type to augment AST nodes with typed data properties.
 *
 * This ensures type safety when working with nodes that have been
 * enhanced with additional metadata during processing.
 *
 * @template T - The base AST node type
 * @template J - The data structure to attach
 */
type NodeWithData<T extends Node, J extends Data> = T & {
  data: J;
};

export interface ChangeEntry {
  // The Node.js version or versions where said change was introduced simultaneously
  version: string | Array<string>;
  // The GitHub PR URL of said change
  'pr-url': string | undefined;
  // The description of said change
  description: string;
}

/**
 * YAML frontmatter properties commonly found in API documentation.
 *
 * These properties provide metadata about API elements including
 * versioning, deprecation status, stability indicators, and
 * additional documentation context.
 */
export interface YAMLProperties {
  /** Source position information for the YAML block */
  yamlPosition?: Position;

  // === Core Metadata ===
  /** Type classification of the API element */
  type?: string;
  /** Link to the source code implementation */
  source_link?: string;
  /** Human-readable description for LLM processing */
  llm_description?: string;
  /** Associated tags for categorization */
  tags?: Array<string>;

  /** Version when this API was first added */
  added?: string;
  /** Version when this API was first added */ // TODO(@avivkeller): Merge this with `added`
  introduced_in?: string;
  /** Version when this API was deprecated */
  deprecated?: string;
  /** Version when this API was removed */
  removed?: string;

  /** N-API version requirement (legacy format) */
  napiVersion?: string;

  /** Array of change records with version info */
  changes?: Array<ChangeEntry>;

  /** Allow for additional YAML properties not explicitly defined */
  [key: string]: unknown;
}

export type HeadingType =
  | 'event'
  | 'global'
  | 'method'
  | 'property'
  | 'class'
  | 'module'
  | 'classMethod'
  | 'ctor';

/**
 * Data structure for enhanced heading nodes.
 * Extracted as a separate interface for reusability and clarity.
 */
export interface HeadingData extends Data {
  /** Extracted plain text content of the heading */
  text: string;
  /** The name of the module that this heading refers to */
  name: string;
  /** URL-safe slug derived from heading text */
  slug: string;
  /** Optional type classification */
  type?: HeadingType;
}

/**
 * Represents a processed heading that includes both the original
 * AST structure and computed metadata like text content and URL slug.
 */
export type HeadingNode = NodeWithData<Heading, HeadingData>;

/**
 * Data structure for stability index entries.
 */
export interface StabilityData extends Data {
  /** Numeric stability index (0-3) */
  index: string;
  /** Human-readable stability description */
  description: string;
}

/**
 * Individual stability entry with metadata.
 */
export type StabilityNode = NodeWithData<Blockquote, StabilityData>;

/**
 * Complete metadata entry for a single API documentation element.
 *
 * This represents the processed result of parsing a section of API
 * documentation, containing all the structured information needed
 * for documentation generation, search indexing, and validation.
 */
export interface MetadataEntry extends YAMLProperties {
  /** Path + API identification */
  api: string;
  path: string; // Note: this is extensionless
  basename: string;
  /** Processed heading with metadata */
  heading: HeadingNode;
  /** Stability classification information */
  stability: StabilityNode;
  /** Main content as markdown AST */
  content: Root;
}
