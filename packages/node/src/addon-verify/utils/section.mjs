/**
 * Checks if a section contains the required code blocks for building.
 * A buildable section must contain at least one C++ (.cc) file and one
 * JavaScript (.js) file.
 *
 * @param {Array<{name: string; content: string}>} codeBlocks Array of code blocks
 * @returns {boolean}
 */
export const isBuildableSection = codeBlocks => {
  return (
    codeBlocks.some(codeBlock => codeBlock.name.endsWith('.cc')) &&
    codeBlocks.some(codeBlock => codeBlock.name.endsWith('.js'))
  );
};

/**
 * Normalizes a section name.
 *
 * @param {string} sectionName Original section name
 * @returns {string}
 */
export const normalizeSectionName = sectionName => {
  return sectionName.toLowerCase().replace(/\s/g, '_').replace(/\W/g, '');
};

/**
 * Generates a standardized folder name for a section.
 *
 * @param {string} sectionName Normalized section name
 * @param {number} index Zero-based section index
 * @returns {string}
 */
export const generateSectionFolderName = (sectionName, index) => {
  const identifier = String(index + 1).padStart(2, '0');

  return `${identifier}_${sectionName}`;
};
