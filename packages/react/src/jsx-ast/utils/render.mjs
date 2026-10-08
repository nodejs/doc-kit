'use strict';

import { getProcessor } from '@doc-kit/core/utils/markdown/processor.mjs';
import { u as createTree } from 'unist-builder';

import { createJSXElement } from './ast.mjs';

/**
 * Renders inline nodes as a JSX fragment. It runs synchronously, so without
 * the configured plugins, which may be asynchronous.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes - The nodes to render.
 * @returns {import('estree-jsx').JSXFragment} The rendered nodes.
 */
export const renderAsJSX = nodes =>
  getProcessor('jsx-ast', { configured: false }).runSync(
    createTree('root', [createJSXElement(null, { children: nodes })])
  ).body[0].expression;
