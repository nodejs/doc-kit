// The plurals associated with each section type.
export const SECTION_TYPE_PLURALS = {
  module: 'modules',
  misc: 'miscs',
  class: 'classes',
  method: 'methods',
  property: 'properties',
  global: 'globals',
  example: 'examples',
  ctor: 'signatures',
  classMethod: 'classMethods',
  event: 'events',
  var: 'vars',
};

// The keys to not promote when promoting children.
export const UNPROMOTED_KEYS = ['textRaw', 'name', 'type', 'desc', 'miscs'];
