import { execFileSync } from 'node:child_process';
import { glob, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * The root of the Git repository, which source links are relative to, or
 * the working directory outside of one.
 */
export const repositoryRoot = () => {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    });

    return root.trim();
  } catch {
    return process.cwd();
  }
};

/**
 * Writes a file, unless it already holds these contents: a rebuild only
 * touches the files that changed.
 *
 * @param {string} file
 * @param {string} contents
 */
export const writeIfChanged = async (file, contents) => {
  const current = await readFile(file, 'utf8').catch(() => undefined);

  if (current === contents) {
    return;
  }

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, contents);
};

/**
 * Removes the Markdown files of a directory that are not about to be written:
 * pages of a previous run that no longer exist. Other files (an `index.mdx`)
 * are left alone.
 *
 * @param {string} directory
 * @param {Map<string, string>} files The files about to be written
 */
export const removeStalePages = async (directory, files) => {
  for await (const file of glob('*.md', { cwd: directory })) {
    if (!files.has(file)) {
      await rm(join(directory, file));
    }
  }
};
