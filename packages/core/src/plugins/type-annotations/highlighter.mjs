'use strict';

import { typeAnnotationToHast } from './hast.mjs';

/**
 * Creates the syntax-highlighted mdast→hast handler for `typeAnnotation`
 * nodes, used by the web (JSX) pipeline. The whole type is highlighted as one
 * inline fragment, and each resolved identifier's exact character range is
 * wrapped in an `<a>` via Shiki decorations. Values that are not TypeScript
 * (display names such as `HTTP/2 Headers Object`) are highlighted as plain
 * text, so their prose is not coloured as operators and numeric literals.
 *
 * Falls back to the minimal handler when the type failed to parse or nothing
 * resolved (no point paying for highlighting then).
 *
 * @param {() => import('#plugins/shiki/highlighter.mjs').SyntaxHighlighter} getHighlighter - Gives the highlighter, once a type is highlighted
 * @returns {(state: import('mdast-util-to-hast').State, node: import('mdast').Node) => import('hast').Element}
 */
export const createTypeAnnotationHandler = getHighlighter => (state, node) => {
  const links = node.data?.links ?? [];

  if (node.data?.parseError || links.length === 0) {
    return typeAnnotationToHast(state, node);
  }

  const { shiki } = getHighlighter();
  const [lightTheme, darkTheme] = shiki.getLoadedThemes();

  const root = shiki.codeToHast(node.value, {
    lang: node.data?.typescript ? 'typescript' : 'text',
    themes: { light: lightTheme, dark: darkTheme },
    decorations: links.map(({ start, end, href }) => ({
      start,
      end,
      tagName: 'a',
      properties: { href, class: 'type-link' },
      alwaysWrap: true,
    })),
  });

  // codeToHast wraps the highlighted line in <pre><code>; re-shape that into
  // a single inline <code> element ("only the outermost type opens/closes
  // the code fragment")
  const [preElement] = root.children;
  const [codeElement] = preElement.children;

  const result = {
    type: 'element',
    tagName: 'code',
    properties: {
      class: `${preElement.properties.class} type`,
    },
    children: codeElement.children,
  };

  state.patch(node, result);

  return state.applyData(node, result);
};
