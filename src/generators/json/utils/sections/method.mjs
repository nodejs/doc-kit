'use strict';

import { parseParameterList } from '../../../../utils/parseParameterList.mjs';
import { METHOD_PARAM_EXPRESSION } from '../../constants.mjs';
import { createParameterGroupings } from '../createParameterGroupings.mjs';
import { findParentSection } from '../findParentSection.mjs';

/**
 * Parses the parameters that the method accepts
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 *
 * @returns {{
 * parameters?: Record<string, import('../../generated/generated.d.ts').MethodParameter>,
 * returns?: import('../../generated/generated.d.ts').MethodReturnType
 * } | undefined}
 */
export function parseParameters(entry) {
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

  parseParameterList(listNode).forEach(
    ({ name, type, description, isReturnType }) => {
      if (!name) {
        // Parameter doesn't have a name so we can't use it
        return;
      }

      /**
       * @type {import('../../generated/generated.d.ts').MethodParameter}
       */
      const parameter = {
        '@name': name,
        '@type': type.length === 1 ? type[0] : type,
        description,
      };

      if (isReturnType) {
        returns = parameter;
      } else {
        parameters[name] = parameter;
      }
    }
  );

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
        defaultValue = parameterName.substring(equalSignPos + 1).trim();

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
      parameters: signatureParameters.length ? signatureParameters : undefined,
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
  const parameterList = parseParameters(entry) ?? {};

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
  if (!parametersNames && !parameterList.parameters) {
    // Method doesn't have any parameters, return early
    section.signatures.push(baseSignature);
    return;
  }

  /**
   * @example ['[sources[', 'options]]']`
   */
  parametersNames = parametersNames?.split(',');

  createSignatures(
    section,
    baseSignature,
    parametersNames ?? [],
    parameterList.parameters ?? []
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
