import { isMainThread } from 'node:worker_threads';

import ChildLogger from './child.mjs';
import ParentLogger from './parent.mjs';

/** @type {import('winston').Logger} */
export default isMainThread ? ParentLogger : ChildLogger;
