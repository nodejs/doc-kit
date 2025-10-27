// @ts-check
'use strict';

import {
  assertAstType,
  assertAstTypeOptional,
} from '../../../utils/assertAstType.mjs';
import { GeneratorError } from '../../../utils/generator-error.mjs';
import {
  METHOD_PARAM_EXPRESSION,
  METHOD_RETURN_TYPE_EXTRACTOR,
  METHOD_TYPE_EXTRACTOR,
} from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';
import { ParameterTree } from './parameter-tree.mjs';
import { parseTypeList } from './parseTypeList.mjs';
import { stringifyNode } from './stringifyNode.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

/**
 * Handles each node in a parameter list
 * @param {import('mdast').ListItem} param0
 * @returns {import('../generated.d.ts').MethodParameter | (import('../generated.d.ts').MethodReturnType & { returnType: true })}
 */
export const parseParameterListNode = ({ children }) => {
  /**
   * A parameter's type declaration (ex/ "`asd` {string} Description of asd")
   * or the method's return value (ex/ "Returns: {integer}").
   */
  const paragraph = assertAstType(children[0], 'paragraph');

  // TODO: if the type of the parameter is `object`, sometimes it's followed
  // by a `list` node that contains the properties expected on that object.
  // I'd really like those to be included in the json output, but for now
  // they're not going to be for simplicitly sakes (they still should be in
  // the description of the method though).

  /**
   * @type {import('../generated.d.ts').MethodParameter | import('../generated.d.ts').MethodReturnType}
   */
  const parameter = {};

  let descriptionIndex;

  const firstChild = paragraph.children[0];
  switch (firstChild.type) {
    case 'inlineCode': {
      // paragraph is something like "`asd` {string} Description of asd"
      parameter['@name'] = firstChild.value;

      const spacer = assertAstTypeOptional(paragraph.children[1], 'text');
      if (!spacer) {
        break;
      }

      const trimmedSpacer = spacer.value.trim().replaceAll('\n', '');

      const match = METHOD_TYPE_EXTRACTOR.exec(trimmedSpacer);
      if (match) {
        parameter['@type'] = match[1].split('|').map(type => type.trim());
        parameter.description = match[2].trim();

        // Any nodes after this one should be part of the description
        descriptionIndex = 1;

        break;
      }

      // Spacer is just a spacer, either literally just ' ' or like ': ',
      // let's ignore it and try getting type + description from nodes after
      // it
      const { types, endingIndex } = parseTypeList(paragraph.children, 2);

      if (types.length === 0) {
        parameter['@type'] = 'any';
      } else {
        parameter['@type'] = types.length === 1 ? types[0] : types;
      }

      descriptionIndex = endingIndex + 1;

      break;
    }
    case 'text': {
      // paragraph is something like: "Returns: {integer}""

      const returnRegex = METHOD_RETURN_TYPE_EXTRACTOR.exec(firstChild.value);
      if (returnRegex) {
        // Nothing special about this, it's just

        const [_, _2, type, description] = returnRegex;
        parameter['@type'] = type.split('|').map(type => type.trim());
        parameter.description = description?.trim();

        // Any nodes after this one should be part of the description
        descriptionIndex = 1;

        break;
      }

      if (firstChild.value !== 'Returns: ') {
        // Not relevant to us
        break;
      }

      parameter.returnType = true;

      if (paragraph.children.length < 2) {
        throw new GeneratorError(
          `expected at least 2 children in a method's return type`
        );
      }

      switch (paragraph.children[1].type) {
        case 'inlineCode': {
          // Returns: undefined
          parameter['@type'] = paragraph.children[1].value;
          descriptionIndex = 2;

          break;
        }
        case 'link': {
          const { types, endingIndex } = parseTypeList(paragraph.children, 1);
          if (types.length === 0) {
            parameter['@type'] = 'any';
          } else {
            parameter['@type'] = types.length === 1 ? types[0] : types;
          }

          descriptionIndex = endingIndex + 1;

          break;
        }
        default: {
          throw new GeneratorError(
            `unexpected child type ${paragraph.children[1].type}`
          );
        }
      }

      break;
    }
    default: {
      throw new GeneratorError(`unexpected type ${firstChild.type}`);
    }
  }

  if (descriptionIndex) {
    for (let i = descriptionIndex; i < paragraph.children.length; i++) {
      parameter.description ??= '';
      parameter.description += stringifyNode(paragraph.children[i]);
    }
  }

  if (parameter.description) {
    parameter.description = parameter.description.trim();
  }

  return parameter;
};

/**
 * Parses the parameters that the method accepts
 * @param {HierarchizedEntry} entry The AST entry
 *
 * @returns {{
 *   parameters?: Record<string, import('../generated.d.ts').MethodParameter>,
 *   returns?: import('../generated.d.ts').MethodReturnType
 * } | undefined}
 */
export const parseParameterList = entry => {
  // Ignore header
  const [, ...nodes] = entry.content.children;

  // The first child node should be the method's parameter list. If there
  // isn't one, there is no parameter list.
  const listNode = nodes[0];
  if (!listNode || listNode.type !== 'list') {
    // Method doesn't take in any parameters
    return undefined;
  }

  /**
   * @type {Record<string, import('../generated.d.ts').MethodParameter>}
   */
  const parameters = {};
  /**
   * @type {import('../generated.d.ts').MethodReturnType}
   */
  let returns = { '@type': 'any' };

  listNode.children.forEach(listItem => {
    const parameter = parseParameterListNode(listItem);

    if (parameter.returnType) {
      // Return type
      returns = { ...parameter, returnType: undefined };
    } else {
      parameters[parameter['@name']] = parameter;
    }
  });

  return {
    parameters,
    returns,
  };
};

/**
 * TODO docs
 * @param {Array<string>} parameterNames
 * @param {number} [optionalDepth=0]
 * @param {import('./parameter-tree.mjs').Counter} [counter={ count: 0 }]
 * @returns {ParameterTree}
 */
export function createParameterTree(
  parameterNames,
  optionalDepth = 0,
  counter = { count: 0 }
) {
  const tree = new ParameterTree(counter);

  mainLoop: for (let i = 0; i < parameterNames.length; i++) {
    /**
     * @example 'length]]'
     * @example 'arrayBuffer['
     * @example '[sources['
     * @example 'end'
     */
    const parameterName = parameterNames[i].trim();

    if (parameterName.endsWith('[')) {
      // Something like `sources[`, let's add it to the current tree
      const name = parameterName.substring(0, parameterName.length - 1);
      tree.addParameter(name);

      // Create a child tree to add the optional parameters after this one
      const children = createParameterTree(
        parameterNames.slice(i + 1),
        optionalDepth + 1,
        counter
      );
      tree.children.push(children);

      // Skip over the parameter names that were processed and included in the
      // child tree
      let newIndex = i + children.parameters.length;
      if (!parameterNames[newIndex]?.endsWith(']')) {
        newIndex++;
      }
      i = newIndex;

      continue;
    }

    let nameEndIndex = parameterName.length;
    while (nameEndIndex > 0 && parameterName[nameEndIndex - 1] === ']') {
      // Something like `length]]`
      nameEndIndex--;
      optionalDepth--;

      if (optionalDepth <= 0) {
        // Finished with the level of optional parameters that we care about,
        // break the main loop so we can return what we have so far in the tree
        nameEndIndex =
          parameterName[nameEndIndex - 1] === ']'
            ? nameEndIndex - 1
            : nameEndIndex;
        tree.addParameter(parameterName.substring(0, nameEndIndex));

        break mainLoop;
      }
    }

    // Nothing special about this parameter, just need to add it to the tree
    const name = parameterName.substring(0, nameEndIndex);
    tree.addParameter(name);
  }

  return tree;
}

/**
 * TODO docs
 * @param {Array<string>} parameterNames
 * @returns {Array<Array<string>>}
 */
export function createParameterGroupings(parameterNames) {
  // Parameters are declared in the section's header with something like
  // `new Thing([sources[, options, flag[, abc]]])`. Here we should only see
  //  the parameters without the function name though (i.e. just 
  // `[sources[, options, flag[, abc]]]`).
  // 
  // For this example specifically, we want to create three method signatures:
  //  1. For `new Thing(sources)`
  //  2. For `new Thing(sources, options, flag)`
  //  3. For `new Thing(sources, options, flag, abc)`
  // 
  // So, let's create multiple groups that each hold a combination of
  // parameter names that can be used to call the function.

  /**
   * @type {Array<Array<string>>}
   */
  const groupings = [];

  /**
   * @type {ParameterTree}
   */
  let parameterTree;

  if (parameterNames[0]?.startsWith('[')) {
    // Special case: starting off with optional parameters.
    // Remove the [
    parameterNames[0] = parameterNames[0].substring(1);

    // Add an empty grouping
    groupings.push([]);

    // Create the tree like usual
    parameterTree = createParameterTree(parameterNames, 1);
  } else {
    parameterTree = createParameterTree(parameterNames);
  }

  groupings.push(...parameterTree.coalesce());

  return groupings;
}

/**
 * Given a list of parameter names in the order that they should appear and
 * a map of paramter names to their type info, let's create the signature
 * objects necessary and add it to the section.
 * @param {import('../generated.d.ts').Method} section
 * @param {import('../generated.d.ts').MethodSignature} baseSignature Signature to base the others on
 * @param {Array<string>} parameterNames
 * @param {Record<string, import('../generated.d.ts').MethodParameter>} parameters
 */
export const createSignatures = (
  section,
  baseSignature,
  parameterNames,
  parameters
) => {
  const parameterGroupings = createParameterGroupings(parameterNames);

  let signatureIndex = section.signatures?.length ?? 0;
  section.signatures = [
    ...(section.signatures ?? []),
    ...new Array(parameterGroupings.length),
  ];

  for (const grouping of parameterGroupings) {
    /**
     * @type {Array<import('../generated.d.ts').MethodParameter>}
     */
    const signatureParameters = new Array(grouping.length);

    for (let i = 0; i < signatureParameters.length; i++) {
      const parameterName = grouping[i];

      // TODO handle default value for parameters

      let parameter =
        parameterName in parameters ? parameters[parameterName] : undefined;

      if (!parameter) {
        console.warn(
          `parameter name ${parameterName} included in method's signature but not parameter list, defaulting to type \`any\``
        );
        parameter = { '@name': 'value', '@type': 'any' };
      }

      signatureParameters[i] = parameter;
    }

    section.signatures[signatureIndex] = {
      '@returns': baseSignature['@returns'],
      parameters: signatureParameters,
    };

    signatureIndex++;
  }
};

/**
 * Parses the signatures that the method may have and adds them to the
 * section.
 * @param {HierarchizedEntry} entry The AST entry
 * @param {import('../generated.d.ts').Method} section The method section
 */
export const parseSignatures = (entry, section) => {
  section.signatures = [];

  /**
   * @type {import('../generated.d.ts').MethodSignature}
   */
  const baseSignature = {
    '@returns': { '@type': 'any' },
  };

  // Parse the parameters defined in the parameter list and grab the return
  // type (if the list actually exists and those are present in it)
  const parameterList = parseParameterList(entry) ?? {};

  if (parameterList.returns) {
    // Return type was defined in the parameter list, let's update the base
    // signature
    baseSignature['@returns'] = parameterList.returns;
  }

  /**
   * Extract the parameter names mentioned in the entry's header. This gives
   * us 1) the order in which they appear and 2) whether or not they're
   * optional
   * @example `[sources[, options]]`
   */
  let [, parametersNames] =
    entry.heading.data.text
      .substring(1, entry.heading.data.text.length - 1)
      .match(METHOD_PARAM_EXPRESSION) || [];
  if (!parametersNames) {
    // Method doesn't have any parameters, return early
    section.signatures.push(baseSignature);
    return;
  }

  /**
   * @example ['[sources[', 'options]]']`
   */
  parametersNames = parametersNames.split(',');

  createSignatures(
    section,
    baseSignature,
    parametersNames,
    parameterList.parameters
  );
};

export const createMethodSectionBuilder = () => {
  /**
   * Adds the properties expected in a method section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Method} section The method section
   */
  return (entry, section) => {
    parseSignatures(entry, section);

    const parent = findParentSection(section, ['class', 'module']);

    // Add this section to the parent if it exists
    if (parent) {
      // Put static methods in `staticMethods` property and non-static methods
      // in the `methods` property
      const property = entry.heading.data.text.startsWith('Static method:')
        ? 'staticMethods'
        : 'methods';

      if (!Array.isArray(parent[property])) {
        throw new GeneratorError(
          `expected parent[${property}] to be an array, got type ${typeof parent[property]} instead (parent type=${parent.type})`
        );
      }

      parent[property].push(section);
    }
  };
};
