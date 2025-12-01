'use strict';

/**
 * @typedef {{
 * name: string,
 * createdAt: number
 * }} Parameter
 *
 * @typedef {{
 * count: number
 * }} Counter
 */
export class ParameterTree {
  /**
   * @type {Array<Parameter>}
   */
  #parameters = [];

  /**
   * @type {Array<ParameterTree>}
   */
  #children = [];

  /**
   * @type {Counter}
   */
  #counter;

  /**
   * @type {ParameterTree | undefined}
   */
  #parent;

  /**
   * @param {Counter} counter
   * @param {ParameterTree} [parent=undefined]
   */
  constructor(counter = { count: 0 }, parent = undefined) {
    this.#counter = counter;
    this.#parent = parent;
  }

  /**
   *
   */
  get parent() {
    return this.#parent;
  }

  /**
   * @param {string} name
   */
  addParameter(name) {
    this.#parameters.push({
      name,
      createdAt: this.#counter.count++,
    });
  }

  /**
   * @returns {ParameterTree}
   */
  createSubTree() {
    const tree = new ParameterTree(this.#counter, this);
    this.#children.push(tree);

    return tree;
  }

  /**
   * @param {boolean} [includeFirstChildren=false]
   * @returns {Array<Array<Parameter>>}
   */
  coalesce(includeFirstChildren = false) {
    const children = this.#children
      .map(child =>
        child.coalesce(false).map(array => [...this.#parameters, ...array])
      )
      .flat();

    const coalescedParameters = [this.#parameters, ...children];

    if (includeFirstChildren) {
      const firstChildren = new Set(this.#parameters);
      this.#children.forEach(child => {
        child.#parameters.forEach(parameter => firstChildren.add(parameter));
      });

      coalescedParameters.push(Array.from(firstChildren));
    }

    return coalescedParameters;
  }

  /**
   * @param {boolean} [includeFirstChildren=false]
   * @returns {Array<Array<string>>}
   */
  coalesceNames(includeFirstChildren = false) {
    return makeArrayUnique(
      this.coalesce(includeFirstChildren).map(array =>
        array
          // Sort parameter names by the order they were processed
          .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
          // Consolidate it to just be the parameter names
          .map(param => param.name)
      )
    );
  }
}

/**
 * Make an array unique without needing to copy its contents or do things
 * more inefficiently
 *
 * @template {Array<unknown>} T
 *
 * @param {T} array
 * @returns {T}
 */
function makeArrayUnique(array) {
  /**
   * @type {Record<T[number], boolean>}
   */
  const seen = {};

  return array.filter(value => {
    // eslint-disable-next-line no-prototype-builtins
    if (seen.hasOwnProperty(value)) {
      return false;
    }

    seen[value] = true;

    return true;
  });
}
