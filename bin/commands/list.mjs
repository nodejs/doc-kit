import { publicGenerators } from '../../src/generators/index.mjs';
import reporters from '../../src/linter/reporters/index.mjs';
import rules from '../../src/linter/rules/index.mjs';
import { Logger } from '../../src/logger/index.mjs';

const availableRules = Object.keys(rules);
const availableReporters = Object.keys(reporters);

export const types = ['generators', 'rules', 'reporters'];

/**
 * Lists available generators, rules, or reporters based on the given type.
 *
 * @param {'generators' | 'rules' | 'reporters'} type - The type of items to list.
 */
export default function list(type) {
  const list =
    type === 'generators'
      ? Object.entries(publicGenerators).map(
          ([key, generator]) =>
            `${generator.name || key} (v${generator.version}) - ${generator.description}`
        )
      : type === 'rules'
        ? availableRules
        : availableReporters;

  Logger.getInstance().info(list.join('\n'));
}
