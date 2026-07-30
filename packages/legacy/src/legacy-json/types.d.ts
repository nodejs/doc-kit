import { ListItem } from '@types/mdast';
import { MetadataEntry } from '@node-core/doc-kit/generators/metadata/types';
import { MethodSignature } from '@node-core/doc-kit/utils/signature/types';

/**
 * A node in the entry hierarchy.
 */
export interface HierarchizedEntry {
  /**
   * The metadata entry this node wraps.
   */
  entry: MetadataEntry;

  /**
   * Child nodes nested under this entry, based on heading depth.
   */
  children: HierarchizedEntry[];
}

/**
 * Contains metadata related to changes, additions, removals, and deprecated statuses of an entry.
 */
export type Meta = Pick<
  MetadataEntry,
  'changes' | 'added' | 'napiVersion' | 'deprecated' | 'removed'
>;

/**
 * Base interface for sections in the API documentation, representing common properties.
 */
export interface SectionBase {
  /**
   * The inferred API file or module name (e.g., 'fs', 'http', 'path').
   */
  api: string;

  /**
   * The type of section (e.g., 'module', 'method', 'property').
   */
  type: string;

  /**
   * The name of the section.
   */
  name: string;

  /**
   * Raw text content associated with the section.
   */
  textRaw: string;

  /**
   * Display name of the section.
   */
  displayName?: string;

  /**
   * A detailed description of the section.
   */
  desc: string;

  /**
   * A brief description of the section.
   */
  shortDesc?: string;

  /**
   * Stability index of the section.
   */
  stability?: number;

  /**
   * Descriptive text related to the stability of the section (E.G. "Experimental").
   */
  stabilityText?: string;

  /**
   * Metadata associated with the section.
   */
  meta: Meta;
}

/**
 * Represents a module section, which can contain other modules, classes, methods, properties, and other sections.
 */
export interface ModuleSection extends SectionBase {
  /**
   * The type of section. Always 'module' for this interface.
   */
  type: 'module';

  /**
   * Source of the module (File path).
   */
  source: string;

  /**
   * Miscellaneous sections associated with the module.
   */
  miscs?: MiscSection[];

  /**
   * Submodules within this module.
   */
  modules?: ModuleSection[];

  /**
   * Classes within this module.
   */
  classes?: SignatureSection[];

  /**
   * Methods within this module.
   */
  methods?: MethodSignature[];

  /**
   * Properties within this module.
   */
  properties?: PropertySection[];

  /**
   * Global definitions associated with the module.
   */
  globals?: ModuleSection | { type: 'global' };

  /**
   * Signatures (e.g., functions, methods) associated with this module.
   */
  signatures?: SignatureSection[];
}

/**
 * Represents a signature section for methods, constructors, or classes.
 */
export interface SignatureSection extends SectionBase {
  /**
   * The type of section. It can be one of 'class', 'ctor' (constructor), 'classMethod', or 'method'.
   */
  type: 'class' | 'ctor' | 'classMethod' | 'method';

  /**
   * A list of method signatures within this section.
   */
  signatures: MethodSignature[];
}

/**
 * All possible types of sections.
 */
export type Section =
  | SignatureSection
  | PropertySection
  | EventSection
  | MiscSection;

/**
 * Represents a property section in the API documentation.
 */
export interface PropertySection extends SectionBase {
  /**
   * The type of section. Always 'property' for this interface.
   */
  type: 'property';

  /**
   * Arbitrary key-value pairs for the property.
   */
  [key: string]: string | undefined;
}

/**
 * Represents an event section, typically containing event parameters.
 */
export interface EventSection extends SectionBase {
  /**
   * The type of section. Always 'event' for this interface.
   */
  type: 'event';

  /**
   * A list of parameters associated with the event.
   */
  params: ListItem[];
}

/**
 * Represents a miscellaneous section with arbitrary content.
 */
export interface MiscSection extends SectionBase {
  /**
   * The type of section. Always 'misc' for this interface.
   */
  type: 'misc';

  [key: string]: string | undefined;
}

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, AsyncGenerator<Section>>,
  ProcessChunk<{ head: MetadataEntry; nodes: Array<MetadataEntry> }, Section>
>;
