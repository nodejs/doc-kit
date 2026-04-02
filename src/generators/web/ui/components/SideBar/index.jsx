import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';
import { relative } from '../../../../../utils/url.mjs';
import { buildSideBarGroups } from '../../utils/sidebar.mjs';

import { title, version, versions, pages } from '#theme/config';

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

  const items = pages.map(([heading, path, category]) => ({
    label: heading,
    link:
      metadata.path === path
        ? `${metadata.basename}.html`
        : `${relative(path, metadata.path)}.html`,
    category,
  }));

  return (
    <SideBar
      pathname={`${metadata.basename}.html`}
      groups={buildSideBarGroups(items)}
      onSelect={redirect}
      as={props => <a {...props} rel="prefetch" />}
      title="Navigation"
    >
      <Select
        label={`${title} version`}
        values={compatibleVersions}
        className={styles.select}
        placeholder={version}
        onChange={redirect}
      />
    </SideBar>
  );
};
