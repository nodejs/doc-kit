'use strict';

// Grabs the default value if present
export const DEFAULT_EXPRESSION = /^(D|d)efault(s|):$/;

// Grabs the type and description of one of the formats for event types
export const EVENT_TYPE_DESCRIPTION_EXTRACTOR = /{(.*)}(.*)/;
