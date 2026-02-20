'use strict';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { visit } from 'unist-util-visit';

import { EXTRACT_CODE_FILENAME_COMMENT } from './constants.mjs';
import { generateFileList } from './utils/generateFileList.mjs';
import {
  generateSectionFolderName,
  isBuildableSection,
  normalizeSectionName,
} from './utils/section.mjs';
import getConfig from '../../utils/configuration/index.mjs';

/**
 * Generates a file list from code blocks.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('addon-verify');

  const sectionsCodeBlocks = input.reduce((addons, node) => {
    const sectionName = node.heading.data.name;

    const content = node.content;

    visit(content, childNode => {
      if (childNode.type === 'code') {
        const filename = childNode.value.match(EXTRACT_CODE_FILENAME_COMMENT);

        if (filename === null) {
          return;
        }

        if (!addons[sectionName]) {
          addons[sectionName] = [];
        }

        addons[sectionName].push({
          name: filename[1],
          content: childNode.value,
        });
      }
    });

    return addons;
  }, {});

  const files = await Promise.all(
    Object.entries(sectionsCodeBlocks)
      .filter(([, codeBlocks]) => isBuildableSection(codeBlocks))
      .flatMap(async ([sectionName, codeBlocks], index) => {
        const files = generateFileList(codeBlocks);

        if (config.output) {
          const normalizedSectionName = normalizeSectionName(sectionName);

          const folderName = generateSectionFolderName(
            normalizedSectionName,
            index
          );

          await mkdir(join(config.output, folderName), { recursive: true });

          for (const file of files) {
            await writeFile(
              join(config.output, folderName, file.name),
              file.content
            );
          }
        }

        return files;
      })
  );

  return files;
}
