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
