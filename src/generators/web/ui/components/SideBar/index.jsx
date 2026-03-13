import Select from '@node-core/ui-components/Common/Select';
import SideBar from '@node-core/ui-components/Containers/Sidebar';

import styles from './index.module.css';
import { STATIC_DATA, SIDEBAR_GROUPS } from '../../constants.mjs';

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
 * Builds grouped sidebar navigation from flat docPages list.
 * Pages not matching any group are placed under "Other".
 * @param {Array<[string, string]>} docPages - [Title, URL] pairs
 * @returns {Array<{ groupName: string, items: Array<{ label: string, link: string }> }>}
 */
const buildSideBarGroups = docPages => {
  const linkMap = new Map(docPages.map(([label, link]) => [link, label]));
  const assigned = new Set();

  const groups = SIDEBAR_GROUPS.map(({ groupName, items }) => ({
    groupName,
    items: items
      .filter(link => {
        if (linkMap.has(link)) {
          assigned.add(link);
          return true;
        }

        return false;
      })
      .map(link => ({ label: linkMap.get(link), link })),
  })).filter(group => group.items.length > 0);

  const otherItems = docPages
    .filter(([, link]) => !assigned.has(link))
    .map(([label, link]) => ({ label, link }));

  if (otherItems.length > 0) {
    groups.push({ groupName: 'Other', items: otherItems });
  }

  return groups;
};

/**
 * Sidebar component for MDX documentation with version selection and page navigation
 * @param {SideBarProps} props - Component props
 */
export default ({ versions, pathname, currentVersion, docPages }) => (
  <SideBar
    pathname={pathname}
    groups={buildSideBarGroups(docPages)}
    onSelect={redirect}
    as={props => <a {...props} rel="prefetch" />}
    title="Navigation"
  >
    <Select
      label={`${STATIC_DATA.title} version`}
      values={versions}
      className={styles.select}
      placeholder={currentVersion}
      onChange={redirect}
    />
  </SideBar>
);
