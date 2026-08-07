import NavBar from '@node-core/ui-components/Containers/NavBar';
import styles from '@node-core/ui-components/Containers/NavBar/index.module.css';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import SearchBox from './SearchBox';
import ThemeToggle from './ThemeToggle.jsx';

import { repository, showSearchBox, navigation } from '#theme/config';
import Logo from '#theme/Logo';

/**
 * NavBar component that displays the headings, search, etc.
 */
export default ({ metadata }) => (
  <NavBar
    Logo={Logo}
    sidebarItemTogglerAriaLabel="Toggle navigation menu"
    navItems={navigation.navbar ?? []}
    // Drives the active-item highlight, and is dereferenced for every item
    // whose link is site-absolute, so it must always be a string.
    pathname={metadata.path}
  >
    {showSearchBox && <SearchBox pathname={metadata.path} />}
    <ThemeToggle />
    {repository && (
      <a
        href={`https://github.com/${repository}`}
        aria-label={`View ${repository} on GitHub`}
        className={styles.ghIconWrapper}
      >
        <GitHubIcon />
      </a>
    )}
  </NavBar>
);
