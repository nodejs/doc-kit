'use strict';

import console from './console.mjs';
import github from './github.mjs';

export const transports = {
  console,
  github,
};

export const availableTransports = Object.keys(transports);
