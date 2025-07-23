import { publicGenerators } from '../../src/generators/index.mjs';
import rules from '../../src/linter/rules/index.mjs';
import { Logger } from '../../src/logger/index.mjs';
import { availableTransports } from '../../src/logger/transports/index.mjs';

const availableRules = Object.keys(rules);

export const types = ['generators', 'rules', 'transports'];

/**
 * Lists available generators, rules, or transports based on the given type.
 *
 * @param {'generators' | 'rules' | 'transports'} type - The type of items to list.
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
        : availableTransports;

  Logger.getInstance().info(list.join('\n'));
}
