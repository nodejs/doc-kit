'use strict';

export const INTRODUCED_IN_REGEX = /<!--\s?introduced_in=.*-->/;

export const LLM_DESCRIPTION_REGEX = /<!--\s?llm_description=.*-->/;

export const LINT_MESSAGES = {
  missingIntroducedIn: "Missing 'introduced_in' field in the API doc entry",
  invalidChangeProperty: 'Invalid change property type',
  missingChangeVersion: 'Missing version field in the API doc entry',
  invalidChangeVersion: 'Invalid version number: {{version}}',
  duplicateStabilityNode: 'Duplicate stability node',
  missingLlmDescription:
    'Missing llm_description field or paragraph node in the API doc entry',
};
