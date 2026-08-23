'use strict';

import { u as createTree } from 'unist-builder';

import { createJSXElement } from './ast.mjs';
import { getRemarkRecma as remark } from './remark.mjs';

/**
 * Renders inline nodes as a JSX fragment
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes - The nodes to render.
 * @returns {import('estree-jsx').JSXFragment} The rendered nodes.
 */
export const renderAsJSX = nodes =>
  remark().runSync(
    createTree('root', [createJSXElement(null, { children: nodes })])
  ).body[0].expression;
