import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';

/**
 * @typedef {Object} SideBarProps
 * @property {string} pathname - The current document
 * @property {Array<string>} versions - Available documentation versions
 * @property {string} currentVersion - Currently selected version
 * @property {Array<[string, string]>} docPages - [Title, URL] pairs
 */

/**
 * Redirect to a URL
 * @param {string} url URL
 */
const redirect = url => (window.location.href = url);

/**
 * Sidebar component for MDX documentation with version selection and page navigation
 * @param {SideBarProps} props - Component props
 */
export default ({ versions, pathname, currentVersion, docPages }) => (
  <SideBar
    pathname={pathname}
    groups={[
      {
        groupName: 'API Documentation',
        items: docPages.map(([label, link]) => ({ label, link })),
      },
    ]}
    onSelect={redirect}
    as={props => <a {...props} rel="prefetch" />}
    title="Navigation"
  >
    <div>
      <Select
        label="Node.js version"
        values={versions}
        inline={true}
        className={styles.select}
        placeholder={currentVersion}
        onChange={redirect}
      />
    </div>
  </SideBar>
);
