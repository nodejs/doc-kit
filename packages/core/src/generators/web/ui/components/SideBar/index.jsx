import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';
import { relativeOrAbsolute } from '../../utils/relativeOrAbsolute.mjs';
import { renderLabel } from '../../utils/renderLabel.jsx';

import { project, version, versions, navigation, pages } from '#theme/config';

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

  const toItem = ({ label, link, items }) => ({
    label: renderLabel(label),
    link: /^https?:/.test(link) ? link : toLink(link),
    ...(items && { items: items.map(toItem) }),
  });

  if (navigation.sidebar) {
    return navigation.sidebar.map(({ groupName, items }) => ({
      groupName,
      items: items.map(toItem),
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
export default ({ metadata }) => {
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
