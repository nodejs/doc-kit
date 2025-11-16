// @ts-check
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
   * @param {Counter} counter
   */
  constructor(counter) {
    this.#counter = counter;
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
   *
   */
  get parameters() {
    return this.#parameters;
  }

  /**
   *
   */
  get children() {
    return this.#children;
  }

  /**
   *
   */
  get counter() {
    return this.#counter;
  }

  /**
   * @returns {Array<Array<Parameter>>}
   */
  coalesce() {
    return [
      this.#parameters,
      ...this.#children
        .map(child =>
          child.coalesce().map(array => [...this.#parameters, ...array])
        )
        .flat(),
    ];
  }

  /**
   * @returns {Array<Array<string>>}
   */
  coalesceNames() {
    return makeArrayUnique(
      this.coalesce().map(array =>
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
