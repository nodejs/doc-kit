'use strict';

import {
  assertAstType,
  assertAstTypeOptional,
} from '../../../../utils/assertAstType.mjs';
import { transformNodesToString } from '../../../../utils/unist.mjs';
import {
  METHOD_PARAM_EXPRESSION,
  METHOD_RETURN_TYPE_EXTRACTOR,
  METHOD_TYPE_EXTRACTOR,
} from '../../constants.mjs';
import { createParameterGroupings } from '../createParameterGroupings.mjs';
import { findParentSection } from '../findParentSection.mjs';
import { parseTypeList } from '../parseTypeList.mjs';

/**
 * Handles each node in a parameter list
 * @param {import('mdast').ListItem} param0
 * @returns {import('../../generated/generated.d.ts').MethodParameter | (import('../../generated/generated.d.ts').MethodReturnType & { returnType: true })}
 */
export function parseParameterListNode({ children }) {
  /**
   * A parameter's type declaration (ex/ "`asd` {string} Description of asd")
   * or the method's return value (ex/ "Returns: {integer}").
   */
  const paragraph = assertAstType(children[0], 'paragraph');

  // TODO: if the type of the parameter is `object`, sometimes it's followed
  // by a `list` node that contains the properties expected on that object.
  // I'd really like those to be included in the json output, but for now
  // they're not going to be for simplicitly's sakes (they still should be in
  // the description of the method though).

  /**
   * @type {import('../../generated/generated.d.ts').MethodParameter | import('../../generated/generated.d.ts').MethodReturnType}
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
        const [, , type, description] = returnRegex;
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
        throw new TypeError(
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
          throw new TypeError(
            `unexpected child type ${paragraph.children[1].type}`
          );
        }
      }

      break;
    }
    default: {
      throw new TypeError(`unexpected type ${firstChild.type}`);
    }
  }

  if (descriptionIndex && descriptionIndex < paragraph.children.length) {
    parameter.description ??= '';
    parameter.description += transformNodesToString(
      paragraph.children.slice(descriptionIndex)
    );
  }

  if (parameter.description) {
    parameter.description = parameter.description.trim();
  }

  return parameter;
}

/**
 * Parses the parameters that the method accepts
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 *
 * @returns {{
 * parameters?: Record<string, import('../../generated/generated.d.ts').MethodParameter>,
 * returns?: import('../../generated/generated.d.ts').MethodReturnType
 * } | undefined}
 */
export function parseParameterList(entry) {
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
   * @type {Record<string, import('../../generated/generated.d.ts').MethodParameter>}
   */
  const parameters = {};
  /**
   * @type {import('../../generated/generated.d.ts').MethodReturnType}
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
}

/**
 * Given a list of parameter names in the order that they should appear and
 * a map of parameter names to their type info, let's create the signature
 * objects necessary and add it to the section.
 * @param {import('../../generated/generated.d.ts').Method} section
 * @param {import('../../generated/generated.d.ts').MethodSignature} baseSignature Signature to base the others on
 * @param {Array<string>} parameterNames
 * @param {Record<string, import('../../generated/generated.d.ts').MethodParameter>} parameters
 */
export function createSignatures(
  section,
  baseSignature,
  parameterNames,
  parameters
) {
  const parameterGroupings = createParameterGroupings(parameterNames);

  let signatureIndex = section.signatures?.length ?? 0;
  section.signatures.length += parameterGroupings.length;

  for (const grouping of parameterGroupings) {
    /**
     * @type {Array<import('../../generated/generated.d.ts').MethodParameter>}
     */
    const signatureParameters = new Array(grouping.length);

    for (let i = 0; i < signatureParameters.length; i++) {
      let parameterName = grouping[i];
      let defaultValue;

      // Check for default value here
      const equalSignPos = parameterName.indexOf('=');
      if (equalSignPos !== -1) {
        defaultValue = parameterName.substring(equalSignPos).trim();

        parameterName = parameterName.substring(0, equalSignPos);
      }

      let parameter =
        parameterName in parameters ? parameters[parameterName] : undefined;

      if (!parameter) {
        parameter = {
          '@name': parameterName,
          '@type': 'any',
          '@default': defaultValue,
        };
      } else if (defaultValue) {
        parameter = {
          ...parameter,
          '@default': defaultValue,
        };
      }

      signatureParameters[i] = parameter;
    }

    section.signatures[signatureIndex] = {
      '@returns': baseSignature['@returns'],
      parameters: signatureParameters,
    };

    signatureIndex++;
  }
}

/**
 * Parses the signatures that the method may have and adds them to the
 * section.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Method} section The method section
 */
export function parseSignatures(entry, section) {
  section.signatures = [];

  /**
   * @type {import('../../generated/generated.d.ts').MethodSignature}
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
  if (!parametersNames || !parameterList.parameters) {
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
}

/**
 * Adds the properties expected in a method section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Method} section The method section
 */
export function createMethodSection(entry, section) {
  parseSignatures(entry, section);

  const parent = findParentSection(section, ['class', 'module']);

  // Add this section to the parent if it exists
  if (parent) {
    let property;
    if (parent.type === 'class' && entry.heading.data.type === 'ctor') {
      property = '@constructor';
    } else {
      // Put static methods in `staticMethods` property and non-static methods
      // in the `methods` property
      property = entry.heading.data.text.startsWith('Static method:')
        ? 'staticMethods'
        : 'methods';
    }

    parent[property] ??= [];
    parent[property].push(section);
  }
}
