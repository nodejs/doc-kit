/**
 * An error thrown by a generator when it encounters something unexpected.
 *
 * @typedef {{
 *   entry?: ApiDocMetadataEntry
 * } & ErrorOptions} GeneratorErrorOptions
 */
export class GeneratorError extends Error {
  /**
   * @type {ApiDocMetadataEntry | undefined}
   */
  entry;

  /**
   * @param {string} message
   * @param {GeneratorErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options);

    this.entry = options?.entry;
  }

  get message() {
    let message = super.message;

    // Add general info of what was being processed when this error was thrown
    // for debugging
    if (this.entry) {
      message += ` (${options.entry.api_doc_source}#${options.entry.slug})`;
    }

    return message;
  }
}
