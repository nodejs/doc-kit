'use strict';

import { ParameterTree } from './parameter-tree.mjs';

/**
 * @typedef {{
 * i: number;
 * optionalDepth: number;
 * }} CreateParameterTreeState
 */

/**
 * Parameters are declared in a section's header. This looks something like
 * `something([sources[, options, flag[, abc]]])`.
 *
 * We wanna be able to extract the parameter names from that declaration in
 * order to create parameter "groupings", or just the various signatures of the
 * parameters that can be used when invoking the function.
 *
 * For instance, using the above signature, we want to create four method
 * signatures for it:
 * 1. For `something()`
 * 2. For `something(sources)
 * 3. For `something(sources, options, flag)
 * 4. For `something(sources, options, flag, abc)
 *
 * This method does just that given an array of the parameter names split by
 * commas.
 *
 * @param {Array<string>} parameterNames
 * @returns {Array<Array<string>>}
 */
export function createParameterGroupings(parameterNames) {
  const tree = createParameterTree(parameterNames);

  return tree.coalesceNames();
}

/**
 * @param {Array<string>} parameterNames
 * @param {CreateParameterTreeState} [state={ i: 0, optionalDepth: 0 }]
 * @param {import('./parameter-tree.mjs').Counter} [counter={ count: 0 }]
 * @returns {ParameterTree}
 */
export function createParameterTree(
  parameterNames,
  state = { i: 0, optionalDepth: 0 },
  counter = { count: 0 }
) {
  const tree = new ParameterTree(counter);

  mainLoop: for (; state.i < parameterNames.length; state.i++) {
    /**
     * @example 'length]]' -> add `length` to tree's parameters, close out optional depth
     * @example 'arrayBuffer[' -> add `arrayBuffer` to tree's parameters, start child tree
     * @example '[sources[' -> start child tree for sources and another child tree for that child
     * @example '[hello]' -> start child tree, add and end child tree
     * @example '[hello' -> start child tree
     * @example '[hello]['
     * @example 'end' -> just add
     */
    let parameter = parameterNames[state.i].trim();
    if (state.i === 0 && parameter.startsWith('[')) {
      if (parameter.endsWith(']')) {
        // `[hello]`
        const name = parameter.substring(1, parameter.length - 1);

        const child = new ParameterTree(counter);
        child.addParameter(name);

        tree.children.push(child);

        continue;
      }

      if (parameter.endsWith('][')) {
        // `[hello][`
        const name = parameter.substring(1, parameter.length - 2);

        const child = new ParameterTree(counter);
        child.addParameter(name);

        tree.children.push(child);
        state.i++;

        addOptionalParametersToChildTree(parameterNames, state, tree);

        continue;
      }

      // Something like `[hello`
      parameterNames[state.i] = parameter.substring(1);

      if (
        state.i + 1 < parameterNames.length &&
        parameterNames[state.i + 1].trim().startsWith(']')
      ) {
        const child = new ParameterTree(counter);
        child.addParameter(parameterNames[state.i]);
        tree.children.push(child);

        parameterNames[state.i + 1] = parameterNames[state.i + 1]
          .trim()
          .substring(1);
      } else {
        addOptionalParametersToChildTree(parameterNames, state, tree);
      }

      continue;
    }

    if (parameter.endsWith('[')) {
      if (parameter.endsWith('][')) {
        // Something like `sources][`
        const name = parameter.substring(0, parameter.length - 2);

        const child = new ParameterTree(counter);
        child.addParameter(name);
        tree.children.push(child);

        state.i++;
        addOptionalParametersToChildTree(parameterNames, state, tree);

        continue;
      }

      // Something like `sources[`, add to current tree
      const name = parameter.substring(0, parameter.length - 1);
      tree.addParameter(name);

      // Handle children
      state.i++;

      addOptionalParametersToChildTree(parameterNames, state, tree);
      if (!parameterNames[state.i]?.endsWith(']')) {
        state.i++;
      }

      continue;
    }

    let nameEndIndex = parameter.length;
    while (nameEndIndex > 0 && parameter[nameEndIndex - 1] === ']') {
      // Something like `length]]`
      nameEndIndex--;
      state.optionalDepth--;

      if (state.optionalDepth <= 0) {
        // Finished with the level of optional parameters that we care about,
        nameEndIndex =
          parameter[nameEndIndex - 1] === ']' ? nameEndIndex - 1 : nameEndIndex;
        tree.addParameter(parameter.substring(0, nameEndIndex));

        break mainLoop;
      }
    }

    // Nothing special about this parameter, just need to add it to the tree
    const name = parameter.substring(0, nameEndIndex);
    tree.addParameter(name);
  }

  return tree;
}

/**
 * Small utility for when we need to parse parameters that should be in a child
 * tree.
 * @param {Array<string>} parameterNames
 * @param {CreateParameterTreeState} state
 * @param {ParameterTree} tree
 */
function addOptionalParametersToChildTree(parameterNames, state, tree) {
  state.optionalDepth++;

  // Create the child tree to add the following parameters to
  const children = createParameterTree(parameterNames, state, tree.counter);
  tree.children.push(children);

  state.optionalDepth--;
}
