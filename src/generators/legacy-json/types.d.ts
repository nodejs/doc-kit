import { ListItem } from '@types/mdast';

/**
 * Represents an entry in a hierarchical structure, extending from ApiDocMetadataEntry.
 * It includes children entries organized in a hierarchy.
 */
export interface HierarchizedEntry extends ApiDocMetadataEntry {
  /**
   * List of child entries that are part of this entry's hierarchy.
   */
  hierarchyChildren: ApiDocMetadataEntry[];
}

/**
 * Contains metadata related to changes, additions, removals, and deprecated statuses of an entry.
 */
export interface Meta {
  /**
   * A list of changes associated with the entry.
   */
  changes: ApiDocMetadataChange[];

  /**
   * A list of added versions or entities for the entry.
   */
  added: string[];

  /**
   * A list of NAPI (Node API) versions related to the entry.
   */
  napiVersion: string[];

  /**
   * A list of versions where the entry was deprecated.
   */
  deprecated: string[];

  /**
   * A list of versions where the entry was removed.
   */
  removed: string[];
}

/**
 * Base interface for sections in the API documentation, representing common properties.
 */
export interface SectionBase {
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
 * Represents a parameter for methods or functions.
 */
export interface Parameter {
  /**
   * The name of the parameter.
   */
  name: string;

  /**
   * Indicates if the parameter is optional.
   */
  optional?: boolean;

  /**
   * The default value for the parameter.
   */
  default?: string;
}

/**
 * Represents a method signature, including its parameters and return type.
 */
export interface MethodSignature {
  /**
   * A list of parameters for the method.
   */
  params: Parameter[];

  /**
   * The return type of the method.
   */
  return?: Parameter;
}

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

/**
 * Represents a list of parameters.
 */
export interface ParameterList {
  /**
   * Raw parameter description
   */
  textRaw: string;

  /**
   * A short description of the parameter.
   */
  desc?: string;

  /**
   * The name of the parameter.
   */
  name: string;

  /**
   * The type of the parameter (E.G. string, boolean).
   */
  type?: string;

  /**
   * The default value.
   */
  default?: string;

  options?: ParameterList;
}
