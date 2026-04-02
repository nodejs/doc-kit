import { SIDEBAR_GROUPS } from '../constants.mjs';

/**
 * @deprecated This is being exported temporarily during the transition period.
 * Reverse lookup: filename (e.g. 'fs.html') -> groupName, used as category
 * fallback for pages without explicit category in metadata.
 */
export const fileToGroup = new Map(
  SIDEBAR_GROUPS.flatMap(({ groupName, items }) =>
    items.map(item => [item, groupName])
  )
);

/**
 * Builds grouped sidebar navigation from categorized page entries.
 * Pages without a category are placed under the provided default group.
 *
 * @param {Array<{ label: string, link: string, category?: string }>} items
 * @param {string} [defaultGroupName='Others']
 * @returns {Array<{ groupName: string, items: Array<{ label: string, link: string }> }>}
 */
export const buildSideBarGroups = (items, defaultGroupName = 'Others') => {
  const groups = new Map();
  const others = [];

  // Group entries by category while preserving insertion order
  for (const { label, link, category } of items) {
    const linkFilename = link.split('/').at(-1);

    // Skip index pages as they are typically the main entry point for a section
    // and may not need to be listed separately in the sidebar.
    if (linkFilename === 'index.html') {
      continue;
    }

    const resolvedCategory = category ?? fileToGroup.get(linkFilename);

    if (!resolvedCategory) {
      others.push({ label, link });
      continue;
    }

    const groupItems = groups.get(resolvedCategory) ?? [];
    groupItems.push({ label, link });
    groups.set(resolvedCategory, groupItems);
  }

  // Convert the groups map to an array while preserving the original order of categories
  const orderedGroups = [...groups.entries()].map(([groupName, items]) => ({
    groupName,
    items,
  }));

  if (others.length > 0) {
    orderedGroups.push({ groupName: defaultGroupName, items: others });
  }

  return orderedGroups;
};
