/**
 * Updates JavaScript files with correct require paths for the build tree.
 *
 * @param {string} content Original code
 * @returns {string}
 */
const updateJsRequirePaths = content => {
  const updatedContent = content.replace(
    "'./build/Release/addon'",
    '`./build/${common.buildType}/addon`'
  );

  return `'use strict';\nconst common = require('../../common');\n${updatedContent}`;
};

/**
 * Creates a binding.gyp configuration for C++ addon compilation.
 *
 * @param {string[]} sourceFiles List of source file names
 * @returns {string}
 */
const createBindingGyp = sourceFiles => {
  const config = {
    targets: [
      {
        target_name: 'addon',
        sources: sourceFiles,
        includes: ['../common.gypi'],
      },
    ],
  };

  return JSON.stringify(config);
};

/**
 * Generates required files list from section's code blocks for C++ addon
 * compilation.
 *
 * @param {{name: string, content: string}[]} codeBlocks Array of code blocks
 * @returns {{name: string, content: string}[]}
 */
export const generateFileList = codeBlocks => {
  const files = codeBlocks.map(({ name, content }) => {
    return {
      name,
      content: name === 'test.js' ? updateJsRequirePaths(content) : content,
    };
  });

  files.push({
    name: 'binding.gyp',
    content: createBindingGyp(files.map(({ name }) => name)),
  });

  return files;
};
