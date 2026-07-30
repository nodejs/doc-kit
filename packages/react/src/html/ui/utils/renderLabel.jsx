/**
 * Renders a raw Markdown heading. We intentionally
 * only account for backticks, since running a full
 * markdown parse is much slower (and there's never
 * a case where'd have extremely complex markdown
 * within a sidebar like this)
 *
 * @param {string} label - Raw heading text.
 * @returns {import('preact').ComponentChildren}
 */
export const renderLabel = label => {
  const segments = label.split('`');

  if (segments.length === 1) {
    return label;
  }

  // Odd-indexed segments sat between a pair of backticks.
  return segments.map((segment, index) =>
    index % 2 ? (
      <code key={`code:${segment}`}>{segment}</code>
    ) : (
      <span key={`text:${segment}`}>{segment}</span>
    )
  );
};
