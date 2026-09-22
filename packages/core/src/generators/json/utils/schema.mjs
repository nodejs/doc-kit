'use strict';

import { populate } from '#utils/configuration/templates.mjs';

import { SCHEMA_VERSION } from '../constants.mjs';

/**
 * The `$schema` URL a generator's output carries: its `schemaURL` option with
 * the schema version filled in.
 *
 * @param {{ schemaURL: string }} config The generator's configuration
 * @returns {string}
 */
export const resolveSchemaURL = config =>
  populate(config.schemaURL, { ...config, schemaVersion: SCHEMA_VERSION });
