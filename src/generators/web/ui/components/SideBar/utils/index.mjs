import { relative } from '../../../../../../utils/url.mjs';

/**
 * Builds grouped sidebar navigation from categorized page entries.
 * Pages without a category are placed under the provided default group.
 *
 * @param {Array<[string, string, string?]>} pages - Array of page entries as [heading, path, category?]
 * @param {{ path: string, basename: string }} metadata - Metadata for the current page, used to resolve links
 * @param {string} [defaultGroupName='Others'] - Name for the default group containing uncategorized pages
 * @returns {Array<{ groupName: string, items: Array<{ label: string, link: string }> }>}
 */
export const buildSideBarGroups = (
  pages,
  metadata,
  defaultGroupName = 'Others'
) => {
  const items = getSidebarItems(pages, metadata);
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

    if (!category) {
      others.push({ label, link });
      continue;
    }

    const groupItems = groups.get(category) ?? [];
    groupItems.push({ label, link });
    groups.set(category, groupItems);
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

/**
 * Converts page entries to sidebar items with resolved links based on current page metadata.
 * @param {Array<[string, string, string?]>} pages
 * @param {{ path: string, basename: string }} metadata
 * @returns {Array<{ label: string, link: string, category?: string }>}
 */
export const getSidebarItems = (pages, metadata) =>
  pages.map(([heading, path, category]) => ({
    label: heading,
    link:
      metadata.path === path
        ? `${metadata.basename}.html`
        : `${relative(path, metadata.path)}.html`,
    category,
  }));

/**
 * Extracts the major version number from a version string.
 * @param {string} v - Version string (e.g., 'v14.0.0', '14.0.0')
 * @returns {number}
 */
export const getMajorVersion = v =>
  parseInt(String(v).match(/\d+/)?.[0] ?? '0', 10);

/**
 * Filters pre-computed versions by compatibility and resolves per-page URL based on metadata.
 * @param {Array<{ major: number, url: string, label: string }>} versions
 * @param {{ added?: string, introduced_in?: string, path: string }} metadata
 * @returns {Array<{ value: string, label: string }>}
 */
export const getCompatibleVersions = (versions, metadata) => {
  const introducedMajor = getMajorVersion(
    metadata.added ?? metadata.introduced_in
  );

  // Filter pre-computed versions by compatibility and resolve per-page URL
  return versions
    .filter(v => v.major >= introducedMajor)
    .map(({ url, label }) => ({
      value: url.replace('{path}', metadata.path),
      label,
    }));
};

/**
 * Redirect to a URL
 * @param {string} url URL
 */
export const redirect = url => (window.location.href = url);
