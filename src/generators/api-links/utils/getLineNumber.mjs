/**
 *
 * @param {String} code
 * @param {Number} offset
 * @returns {Number}
 */
export function getLineNumber(code = '', offset = 0) {
  let line = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') {
      line++;
    }
  }
  return line;
}
