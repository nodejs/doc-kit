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
  const segmentCounts = new Map();

  return segments.map((segment, index) => {
    if (!segment) {
      return null;
    }

    const type = index % 2 ? 'code' : 'text';
    const count = (segmentCounts.get(`${type}:${segment}`) ?? 0) + 1;

    segmentCounts.set(`${type}:${segment}`, count);

    return index % 2 ? (
      <code key={`${type}:${segment}:${count}`}>{segment}</code>
    ) : (
      <span key={`${type}:${segment}:${count}`}>{segment}</span>
    );
  });
};
