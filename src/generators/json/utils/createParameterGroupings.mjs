'use strict';

import { ParameterTree } from './parameterTree.mjs';

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
 * 2. For `something(sources)`
 * 3. For `something(sources, options, flag)`
 * 4. For `something(sources, options, flag, abc)`
 *
 * This method does just that given an array of the parameter names split by
 * commas.
 *
 * @param {Array<string>} parameterNames
 * @returns {Array<Array<string>>}
 */
export function createParameterGroupings(parameterNames) {
  const [tree, includeFirstChildren] = createParameterTree(parameterNames);

  return tree.coalesceNames(includeFirstChildren);
}

/**
 * @param {Array<string>} parameterNames
 * @returns {[ParameterTree, boolean]}
 */
export function createParameterTree(parameterNames) {
  let tree = new ParameterTree();
  let includeFirstChildren = false;

  for (let i = 0; i < parameterNames.length; i++) {
    /**
     * @example 'length]]' -> add `length` to tree's parameters, close out child tree(s)
     * @example 'arrayBuffer[' -> add `arrayBuffer` to tree's parameters, start child tree
     * @example '[sources[' -> start child tree with parameter `sources`, then start another child tree
     * @example '[hello]' -> start child tree, add `hello` to it, then end it
     * @example '[hello' -> start child tree, add `hello` to it
     * @example '[hello][' -> start child tree, end child tree, start another child tree
     * @example ']max[' -> add `max` to parent tree, start another child tree, set includeFirstChildren to true
     * @example 'end' -> add to tree's parameters
     */
    const parameter = parameterNames[i].trim();

    let nameStartIndex = 0;
    if (parameter.startsWith('[')) {
      tree = tree.createSubTree();
      nameStartIndex++;
    } else if (parameter.startsWith(']')) {
      tree = tree.parent;
      if (!tree) {
        throw new TypeError('parent undefined');
      }

      nameStartIndex++;
    }

    if (!includeFirstChildren) {
      // Something like `]max[`, where we want to have a grouping that contains
      // all of the child parameters
      includeFirstChildren =
        parameter.startsWith(']') && parameter.endsWith('[');
    }

    let depthChange = 0;
    let nameEndIndex = parameter.endsWith('[')
      ? parameter.length - 1
      : parameter.length;
    while (nameEndIndex > 0 && parameter[nameEndIndex - 1] === ']') {
      nameEndIndex--;
      depthChange++;
    }

    const name = parameter.substring(nameStartIndex, nameEndIndex);
    tree.addParameter(name);

    for (let i = 0; i < depthChange; i++) {
      tree = tree.parent;
      if (!tree) {
        throw new TypeError('parent undefined');
      }
    }

    if (parameter.endsWith('[')) {
      tree = tree.createSubTree();
    }
  }

  if (tree.parent) {
    throw new TypeError('returning non-root tree');
  }

  return [tree, includeFirstChildren];
}
