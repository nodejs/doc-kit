import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';
import withIsland from '../../islands/withIsland.jsx';
import { relativeOrAbsolute } from '../../utils/relativeOrAbsolute.mjs';
import { renderLabel } from '../../utils/renderLabel.jsx';

import {
  project,
  version,
  versions,
  navigation,
  pages,
  chunks,
} from '#theme/config';

/**
 * Extracts the major version number from a version string.
 * @param {string} v - Version string (e.g., 'v14.0.0', '14.0.0')
 * @returns {number}
 */
const getMajorVersion = v => parseInt(String(v).match(/\d+/)?.[0] ?? '0', 10);

/**
 * Redirect to a URL
 * @param {string} url URL
 */
const redirect = url => (window.location.href = url);

/**
 * Builds the sidebar groups
 *
 * @param {import('../../types').SerializedMetadata} metadata
 */
const buildGroups = metadata => {
  const toLink = path =>
    metadata.path === path
      ? `${metadata.basename}.html`
      : `${relativeOrAbsolute(path, metadata.path)}.html`;

  // The module being viewed (directly, or through one of its chunk pages)
  const currentModule = metadata.chunk?.path ?? metadata.path;

  /**
   * Nests an item's children under it. An item with children renders as a
   * disclosure rather than a link, so — as nodejs.org's site navigation does —
   * the item repeats itself as the first child to keep its own page reachable.
   *
   * @param {{ label: string, link: string }} item
   * @param {Array<{ label: string, link: string, items?: Array }>} children
   */
  const nest = (item, children) => ({
    ...item,
    items: [{ label: item.label, link: item.link }, ...children],
  });

  /**
   * Converts a chunk section (and its sub-sections) into sidebar items.
   *
   * @param {{ label: string, path: string, items?: Array }} section
   */
  const toSection = ({ label, path, items }) => {
    const item = { label, link: path };

    return items ? nest(item, items.map(toSection)) : item;
  };

  /**
   * @param {{ label: string, link: string, items?: Array }} item
   * @param {boolean} expand - Whether to nest the current module's sections
   */
  const toItem = ({ label, link, items }, expand = true) => {
    const entry = { label, link };

    const { items: children } =
      items || !expand || link !== currentModule || !chunks[link]
        ? { items }
        : nest(entry, chunks[link].items.map(toSection));

    return {
      label: renderLabel(label),
      link: /^https?:/.test(link) ? link : toLink(link),
      ...(children && { items: children.map(child => toItem(child, false)) }),
    };
  };

  if (navigation.sidebar) {
    return navigation.sidebar.map(({ groupName, items }) => ({
      groupName,
      items: items.map(item => toItem(item)),
    }));
  }

  return [
    {
      groupName: 'API Documentation',
      items: pages.map(([label, link]) => toItem({ label, link })),
    },
  ];
};

/**
 * Sidebar component for MDX documentation with version selection and page navigation
 * @param {{ metadata: import('../../types').SerializedMetadata }} props
 */
const Sidebar = ({ metadata }) => {
  const introducedMajor = getMajorVersion(
    metadata.added ?? metadata.introduced_in
  );

  // Filter pre-computed versions by compatibility and resolve per-page URL
  const compatibleVersions = versions
    .filter(v => v.major >= introducedMajor)
    .map(({ url, label }) => ({
      value: url.replace('{path}', metadata.path),
      label,
    }));

  return (
    <SideBar
      pathname={`${metadata.basename}.html`}
      groups={buildGroups(metadata)}
      onSelect={redirect}
      as={props => <a {...props} rel="prefetch" />}
      title="Navigation"
    >
      {/* A site built without a `changelog` has no versions to switch between. */}
      {versions.length > 0 && (
        <div>
          <Select
            label={`${project} version`}
            values={compatibleVersions}
            inline={true}
            className={styles.select}
            placeholder={`v${version.version}`}
            onChange={redirect}
          />
        </div>
      )}
    </SideBar>
  );
};

export default withIsland(Sidebar, { name: 'SideBar', on: { idle: true } });
