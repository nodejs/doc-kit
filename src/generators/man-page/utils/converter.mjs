/**
 * Converts an Abstract Syntax Tree (AST) node to the Mandoc format for Unix manual pages.
 * This function processes the node recursively, converting each supported node type
 * to its corresponding Mandoc markup representation. Unsupported node types will be ignored.
 *
 * @param {import('@types/mdast').Node} node - The AST node to be converted to Mandoc format.
 * @param {boolean} [isListItem=false] - Indicates if the current node is a list item.
 * This parameter is used to correctly format list elements in Mandoc.
 * @returns {string} The Mandoc formatted string representing the given node and its children.
 */
export function convertNodeToMandoc(node, isListItem = false) {
  /**
   * Converts the children of a node to Mandoc format.
   * @param {string} separator
   * @param {boolean} isListItem
   */
  const convertChildren = (separator = '', isListItem = false) =>
    node.children
      .map(child => convertNodeToMandoc(child, isListItem))
      .join(separator);

  /**
   * Escapes special characters in plain text content.
   * @returns {string}
   */
  const escapeText = () => node.value.replace(/\\/g, '\\\\');

  switch (node.type) {
    case 'root':
      // Process the root node by converting all children and separating them with new lines.
      return convertChildren('\n');

    case 'heading':
      // Convert to a Mandoc heading section (.Sh).
      return `.Sh ${convertChildren()}`;

    case 'link':
    case 'paragraph':
    case 'listItem':
      // Convert to Mandoc paragraph or list item.
      // .It denotes a list item in Mandoc, added only if the node is a list item.
      return `${isListItem && node.type === 'listItem' ? '.It\n' : ''}${convertChildren()}`;

    case 'text':
      // Escape any special characters in plain text content.
      return escapeText();

    case 'inlineCode':
      // Format inline code using Mandoc's bold markup (\\fB ... \\fR).
      return `\\fB${escapeText()}\\fR`;

    case 'strong':
      // Format inline code + strong using Mandoc's bold markup (\\fB ... \\fR).
      return `\\fB${convertChildren()}\\fR`;

    case 'code':
      // Format code blocks as literal text using .Bd -literal and .Ed for start and end.
      return `.Bd -literal\n${escapeText()}\n.Ed`;

    case 'list':
      // Convert to a bullet list in Mandoc, starting with .Bl -bullet and ending with .El.
      return `.Bl -bullet\n${convertChildren('\n', true)}\n.El`;

    case 'emphasis':
      // Format emphasized text in Mandoc using italic markup (\\fI ... \\fR).
      return `\\fI${convertChildren()}\\fR`;

    default:
      // Ignore `html`, `blockquote`, etc.
      return '';
  }
}

/**
 * Converts a command-line flag to its Mandoc representation.
 * This function splits the flag into its name and optional value (if present),
 * formatting them appropriately for Mandoc manual pages.
 *
 * @param {string} flag - The command-line flag to be formatted. It may include a value
 * specified with either an equals sign (=) or a space.
 * @returns {string} The Mandoc formatted representation of the flag and its value.
 */
export function flagValueToMandoc(flag) {
  // The separator is '=' or ' '.
  let sep = flag.match(/[= ]/)?.[0];

  if (sep == null) {
    // This flag does not have a default value.
    return '';
  }

  // Split the flag into the name and value based on the separator ('=' or space).
  let value = flag.split(sep)[1];

  // If the value ends with ']', the flag's argument is optional.
  if (value.endsWith(']')) {
    value = '[' + value;
  }

  // If there is no value, return an empty string.
  if (!value) {
    return '';
  }

  // Determine the prefix based on the separator type.
  const prefix = sep === ' ' ? '' : ' Ns = Ns';

  // Combine prefix and formatted value.
  return `${prefix} Ar ${value}`;
}

/**
 * Formats a command-line flag for Mandoc representation.
 * @param {string} flag
 */
const formatFlag = flag =>
  // 'Fl' denotes a flag, followed by an optional 'Ar' (argument).
  `Fl ${flag.split(/\[?[= ]/)[0].slice(1)}${flagValueToMandoc(flag)}`;

/**
 * Converts an API option metadata entry into the Mandoc format.
 * This function formats command-line options, including flags and descriptions,
 * for display in Unix manual pages using Mandoc.
 *
 * @param {import('../../metadata/types').MetadataEntry} element - The metadata entry containing details about the API option.
 * @returns {string} The Mandoc formatted string representing the API option, including flags and content.
 */
export function convertOptionToMandoc(element) {
  // Format the option flags by splitting them, removing backticks, and converting each flag.
  const formattedFlags = element.heading.data.text
    .replace(/`/g, '')
    .split(', ')
    .map(formatFlag)
    .join(' , ')
    .trim();

  // Remove the header itself.
  element.content.children.shift();

  // Return the formatted flags and content, separated by Mandoc markers.
  return `.It ${formattedFlags}\n${convertNodeToMandoc(element.content).trim()}\n.\n`;
}

/**
 * Converts an API environment variable metadata entry into the Mandoc format.
 * This function formats environment variables for Unix manual pages, converting
 * the variable name and value, along with any associated descriptions, into Mandoc.
 *
 * @param {import('../../metadata/types').MetadataEntry} element - The metadata entry containing details about the environment variable.
 * @returns {string} The Mandoc formatted representation of the environment variable and its content.
 */
export function convertEnvVarToMandoc(element) {
  // Split the environment variable into name and optional value.
  const [varName, varValue] = element.heading.data.text
    .replace(/`/g, '')
    .split('=');

  // Format the variable value if present.
  const formattedValue = varValue ? ` Ar ${varValue}` : '';

  // Remove the header itself.
  element.content.children.shift();

  // Return the formatted environment variable and content, using Mandoc's .It (List item) and .Ev (Env Var) macros.
  return `.It Ev ${varName}${formattedValue}\n${convertNodeToMandoc(element.content)}\n.\n`;
}
