import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';
import {
  buildSideBarGroups,
  getCompatibleVersions,
  redirect,
} from './utils/index.mjs';

import { title, version, versions, pages } from '#theme/config';

/**
 * Sidebar component for MDX documentation with version selection and page navigation
 * @param {{ metadata: import('../../types').SerializedMetadata }} props
 */
export default ({ metadata }) => {
  // Build sidebar groups from metadata, categorizing pages and preserving order
  const groups = buildSideBarGroups(pages, metadata);
  // Filter pre-computed versions by compatibility and resolve per-page URL
  const compatibleVersions = getCompatibleVersions(versions, metadata);

  return (
    <SideBar
      pathname={`${metadata.basename}.html`}
      groups={groups}
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
