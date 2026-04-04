/**
 * Default weight used when a page does not define one.
 */
export const DEFAULT_PAGE_WEIGHT = -1;

/**
 * Normalizes a page weight value to a finite number, or falls back to default.
 *
 * @param {unknown} weight
 * @returns {number}
 */
export const normalizePageWeight = weight => {
  if (typeof weight === 'number' && Number.isFinite(weight)) {
    return weight;
  }

  if (typeof weight === 'string') {
    const trimmedWeight = weight.trim();

    if (trimmedWeight.length > 0) {
      const parsedWeight = Number(trimmedWeight);

      if (Number.isFinite(parsedWeight)) {
        return parsedWeight;
      }
    }
  }

  return DEFAULT_PAGE_WEIGHT;
};

/**
 * Sort callback for sidebar pages with explicit weight values.
 *
 * Pages with explicit weight are always shown first. Pages without explicit
 * weight keep their existing upstream order.
 *
 * @param {{ weight: number }} a
 * @param {{ weight: number }} b
 * @returns {number}
 */
export const compareSidebarPageWeight = (a, b) => {
  const aHasWeight = a.weight !== DEFAULT_PAGE_WEIGHT;
  const bHasWeight = b.weight !== DEFAULT_PAGE_WEIGHT;

  if (aHasWeight && bHasWeight && a.weight !== b.weight) {
    return a.weight - b.weight;
  }

  if (aHasWeight) {
    return -1;
  }

  if (bHasWeight) {
    return 1;
  }

  return 0;
};

/**
 * Builds sidebar page tuples in [weight, page] format.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} headNodes
 * @returns {Array<[number, { heading: string, path: string, category?: string }]>}
 */
export const buildSidebarPages = headNodes =>
  headNodes
    .map(({ path, category, heading, weight }) => ({
      heading: heading.data.name,
      path,
      category,
      weight: normalizePageWeight(weight),
    }))
    .toSorted(compareSidebarPageWeight)
    .map(({ heading, path, category, weight }) => [
      weight,
      {
        heading,
        path,
        ...(category !== undefined ? { category } : {}),
      },
    ]);
