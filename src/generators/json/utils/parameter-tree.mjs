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

/**
 *
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
   * @returns {Array<Array<Parameter>>}
   */
  coalesceParameters() {
    return [
      this.#parameters,
      ...this.#children
        .map(child =>
          child
            .coalesceParameters()
            .map(array => [...this.#parameters, ...array])
        )
        .flat(),
    ];
  }

  /**
   * @returns {Array<Array<string>>}
   */
  coalesce() {
    return this.coalesceParameters().map(array =>
      array
        // Sort by the order they were processed
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
        // Consolidate it to just be the parameter names
        .map(param => param.name)
    );
  }
}
