'use strict';

import { enforceArray } from '#utils/array.mjs';

import { resolveGeneratorSpecifier } from './loader.mjs';

/**
 * The resolved specifiers of the generators a generator is delivered through.
 *
 * @param {GeneratorMetadata | undefined} generator
 * @returns {string[]}
 */
const dependentsOf = generator =>
  enforceArray(generator?.dependent ?? []).map(resolveGeneratorSpecifier);

/**
 * Collects the generators reached from the given ones through `dependsOn`.
 *
 * @param {string[]} specifiers - Resolved generator specifiers
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @returns {Set<string>}
 */
const dependencyClosure = (specifiers, generators) => {
  const closure = new Set();
  const stack = [...specifiers];

  while (stack.length > 0) {
    const specifier = stack.pop();

    if (closure.has(specifier)) {
      continue;
    }

    closure.add(specifier);

    const { dependsOn } = generators.get(specifier) ?? {};

    if (dependsOn) {
      stack.push(resolveGeneratorSpecifier(dependsOn));
    }
  }

  return closure;
};

/**
 * Splices a generator into a dependent's pipeline: walking from the dependent
 * up its dependency chain, the first generator that consumes the splicing
 * generator's own input is rewired to consume the splicing generator instead.
 *
 * @param {string} specifier - The generator to splice in
 * @param {string} dependent - The pipeline to splice it into
 * @param {Map<string, string | undefined>} inputOf - Effective inputs, mutated
 * @param {string} name - The splicing generator's name, for errors
 */
const splice = (specifier, dependent, inputOf, name) => {
  const upstream = inputOf.get(specifier);
  const visited = new Set();

  let current = dependent;

  while (current !== undefined && current !== specifier) {
    if (visited.has(current)) {
      break;
    }

    visited.add(current);

    if (inputOf.get(current) === upstream) {
      inputOf.set(current, specifier);
      return;
    }

    current = inputOf.get(current);
  }

  throw new Error(
    `Generator "${name}" declares "${dependent}" as its dependent, but ` +
      `nothing in that pipeline consumes "${upstream ?? 'no input'}", so ` +
      'there is nowhere to splice it in.'
  );
};

/**
 * Follows a generator's `dependent` links to the generators that finally
 * deliver its output. When some of its dependents are already part of the
 * run, only those deliver it; otherwise all of them do.
 *
 * @param {string} specifier - Resolved generator specifier
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {Set<string>} requested - Generators already part of the run
 * @param {Set<string>} [seen] - Guards against dependent cycles
 * @returns {string[]} Resolved specifiers of the terminal generators
 */
const resolveTerminals = (
  specifier,
  generators,
  requested,
  seen = new Set()
) => {
  if (seen.has(specifier)) {
    return [];
  }

  seen.add(specifier);

  const dependents = dependentsOf(generators.get(specifier));

  if (dependents.length === 0) {
    return [specifier];
  }

  const active = dependents.filter(dependent => requested.has(dependent));

  return (active.length > 0 ? active : dependents).flatMap(dependent =>
    resolveTerminals(dependent, generators, requested, seen)
  );
};

/**
 * Resolves the effective pipeline for a run: which generator each generator
 * reads its input from, and which generators the run finally collects.
 *
 * By default a generator reads from its `dependsOn`. A generator that declares
 * one or more `dependent`s is spliced into each dependent's pipeline (see
 * {@link splice}). Several generators may splice at the same point; each later
 * one is inserted upstream of the earlier ones, forming a chain.
 *
 * A requested generator that declares dependents is delivered through them,
 * so the run collects their output rather than the generator's own: through
 * the dependents that are already part of the run when there are any, and
 * through all of them otherwise.
 *
 * @param {string[]} targets - Requested targets, as resolved specifiers
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators,
 * including every dependency and dependent of the targets
 * @returns {{ targets: string[], inputOf: Map<string, string | undefined> }}
 * The generators to collect, and each generator's effective input generator
 */
export const resolvePipeline = (targets, generators) => {
  /** @type {Map<string, string | undefined>} */
  const inputOf = new Map();

  for (const [specifier, { dependsOn }] of generators) {
    inputOf.set(
      specifier,
      dependsOn ? resolveGeneratorSpecifier(dependsOn) : undefined
    );
  }

  for (const [specifier, generator] of generators) {
    for (const dependent of dependentsOf(generator)) {
      splice(specifier, dependent, inputOf, generator.name);
    }
  }

  const requested = dependencyClosure(targets, generators);
  const collected = [];

  for (const target of targets) {
    for (const terminal of resolveTerminals(target, generators, requested)) {
      if (!collected.includes(terminal)) {
        collected.push(terminal);
      }
    }
  }

  return { targets: collected, inputOf };
};
