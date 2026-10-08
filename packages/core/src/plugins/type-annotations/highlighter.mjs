'use strict';

import { highlighter } from '#utils/highlighter.mjs';

import { typeAnnotationToHast } from './hast.mjs';

// Kept apart from `./hast.mjs` on purpose: importing this module loads Shiki
// (every grammar plus the regex engine), which only the pipelines that
// highlight should pay for. The `ast` and `metadata` stages never do.
const [lightTheme, darkTheme] = highlighter.shiki.getLoadedThemes();

/**
 * Syntax-highlighted mdast→hast handler for `typeAnnotation` nodes, used by
 * the web (JSX) pipeline. The whole type is highlighted as one inline
 * fragment, and each resolved identifier's exact character range is wrapped
 * in an `<a>` via Shiki decorations. Values that are not TypeScript (display
 * names such as `HTTP/2 Headers Object`) are highlighted as plain text, so
 * their prose is not coloured as operators and numeric literals.
 *
 * Falls back to the minimal handler when the type failed to parse or nothing
 * resolved (no point paying for highlighting then).
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('mdast').Node} node
 * @returns {import('hast').Element}
 */
export const typeAnnotationToHighlightedHast = (state, node) => {
  const links = node.data?.links ?? [];

  if (node.data?.parseError || links.length === 0) {
    return typeAnnotationToHast(state, node);
  }

  const root = highlighter.shiki.codeToHast(node.value, {
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
