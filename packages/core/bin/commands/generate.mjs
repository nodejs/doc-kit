import { Command } from 'commander';

import createGenerator from '../../src/generators.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '../../src/utils/configuration/index.mjs';
import { errorWrap, insertCommonOptions } from '../utils.mjs';

const { runGenerators } = createGenerator();

export default insertCommonOptions(new Command('generate'))
  .description('Generate API docs')
  .action(
    errorWrap(async opts => {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      await runGenerators(config);
    })
  );
