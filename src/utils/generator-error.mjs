/**
 * An error thrown by a generator when it encounters something unexpected.
 *
 * @typedef {{
 *   entry?: ApiDocMetadataEntry
 * } & ErrorOptions} GeneratorErrorOptions
 */
export class GeneratorError extends Error {
  /**
   * @param {string} message
   * @param {GeneratorErrorOptions} [options]
   */
  constructor(message, options) {
    // Add general info of what was being processed when this error was thrown
    // for debugging
    if (options?.entry) {
      message += ` (${options.entry.api_doc_source}#${options.entry.slug})`;
    }

    super(message, options);
  }
}
