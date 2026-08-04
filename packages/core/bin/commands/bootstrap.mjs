import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { Command, Option } from 'commander';

import { publicGenerators } from '../../src/generators/index.mjs';
import logger from '../../src/logger/index.mjs';
import {
  addIgnoredOutput,
  buildConfigSource,
  detectDocsDirectory,
  findExistingConfig,
  hasMarkdown,
  STARTER_DOC,
} from '../../src/utils/bootstrap.mjs';
import { installGeneratorPackages } from '../../src/utils/install.mjs';
import { errorWrap } from '../utils.mjs';

const bootstrapLogger = logger.child('bootstrap');

/**
 * Asks a question with a default answer.
 *
 * @param {import('node:readline/promises').Interface} rl
 * @param {string} question
 * @param {string} fallback
 * @returns {Promise<string>}
 */
const ask = async (rl, question, fallback) =>
  (await rl.question(`${question} (${fallback}) `)).trim() || fallback;

/**
 * Asks a yes/no question, defaulting to yes.
 *
 * @param {import('node:readline/promises').Interface} rl
 * @param {string} question
 * @returns {Promise<boolean>}
 */
const confirm = async (rl, question) =>
  !/^n/i.test((await rl.question(`${question} (Y/n) `)).trim());

export default new Command('bootstrap')
  .description(
    'Set up a project for doc-kit: a configuration file wired to your ' +
      'package.json, a documentation directory, and the generator packages'
  )
  .argument(
    '[generators...]',
    `Built-in generator names (${Object.keys(publicGenerators).join(', ')})`
  )
  .addOption(new Option('-y, --yes', 'Accept all defaults without prompting'))
  .addOption(new Option('--dir <path>', 'The documentation directory'))
  .addOption(
    new Option('-o, --output <directory>', 'The output directory').default(
      'out'
    )
  )
  .addOption(new Option('--force', 'Overwrite an existing configuration file'))
  .action(
    errorWrap(async (generators, opts) => {
      const cwd = process.cwd();

      const manifestPath = join(cwd, 'package.json');

      if (!existsSync(manifestPath)) {
        throw new Error(
          'No package.json found. Initialize the project first (`npm init`), ' +
            'then run `doc-kit bootstrap` again.'
        );
      }

      const existing = findExistingConfig(cwd);

      if (existing && !opts.force) {
        throw new Error(
          `Found ${existing} — this project is already set up. ` +
            'Pass `--force` to overwrite it.'
        );
      }

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      const rl =
        !opts.yes && stdin.isTTY && stdout.isTTY
          ? createInterface({ input: stdin, output: stdout })
          : undefined;

      try {
        // 1. Which generators?
        let targets = generators;

        if (!targets.length) {
          targets = rl
            ? (await ask(rl, 'Generators to set up (comma-separated)', 'html'))
                .split(',')
                .map(target => target.trim())
                .filter(Boolean)
            : ['html'];
        }

        for (const target of targets) {
          if (!(target in publicGenerators)) {
            throw new Error(
              `"${target}" is not a built-in generator ` +
                `(expected one of: ${Object.keys(publicGenerators).join(', ')}).`
            );
          }
        }

        // 2. Where do the docs live?
        let docsDir = opts.dir ?? detectDocsDirectory(cwd);

        if (rl && !opts.dir) {
          docsDir = await ask(
            rl,
            'Where does your documentation live?',
            docsDir
          );
        }

        mkdirSync(join(cwd, docsDir), { recursive: true });

        if (!hasMarkdown(join(cwd, docsDir))) {
          writeFileSync(join(cwd, docsDir, 'hello.md'), STARTER_DOC);
          bootstrapLogger.info(`Created ${docsDir}/hello.md (a starter page)`);
        }

        // 3. The configuration file
        writeFileSync(
          join(cwd, 'doc-kit.config.mjs'),
          buildConfigSource({
            targets,
            docsDir,
            output: opts.output,
            hasHomepage: Boolean(manifest.homepage),
          })
        );
        bootstrapLogger.info(
          'Created doc-kit.config.mjs (naming and versioning follow your package.json)'
        );

        // 4. Ignore the output directory
        const gitignorePath = join(cwd, '.gitignore');
        const gitignore = addIgnoredOutput(
          existsSync(gitignorePath)
            ? readFileSync(gitignorePath, 'utf-8')
            : undefined,
          opts.output
        );

        if (gitignore !== undefined) {
          writeFileSync(gitignorePath, gitignore);
          bootstrapLogger.info(`Added ${opts.output}/ to .gitignore`);
        }

        // 5. Install the generator packages
        const install = rl
          ? await confirm(rl, 'Install the generator packages now?')
          : true;

        if (install) {
          try {
            installGeneratorPackages(targets);
          } catch (error) {
            bootstrapLogger.warn(
              `Package installation failed (${error.message}). ` +
                `Run \`doc-kit install\` once your registry access is sorted.`
            );
          }
        }
      } finally {
        rl?.close();
      }

      bootstrapLogger.info('All set! Next steps:');
      bootstrapLogger.info(
        '  npx doc-kit serve      write docs with a live preview'
      );
      bootstrapLogger.info('  npx doc-kit generate   build the docs');
      bootstrapLogger.info(
        'Configuration guide: https://github.com/nodejs/doc-kit/blob/main/docs/configuration.md'
      );
    })
  );
