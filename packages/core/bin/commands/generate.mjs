import createGenerator from '../../src/generators.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '../../src/utils/configuration/index.mjs';
import { createCommonCommand, errorWrap } from '../utils.mjs';

const { runGenerators } = createGenerator();

export default createCommonCommand('generate')
  .description('Generate API docs')
  .action(
    errorWrap(async opts => {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      await runGenerators(config);
    })
  );
