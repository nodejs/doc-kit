import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';
import NavBar from '@node-core/ui-components/Containers/NavBar';
import styles from '@node-core/ui-components/Containers/NavBar/index.module.css';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import SearchBox from './SearchBox';
import { STATIC_DATA } from '../constants.mjs';
import { useTheme } from '../hooks/useTheme.mjs';

import Logo from '#config/Logo';

/**
 * NavBar component that displays the headings, search, etc.
 */
export default () => {
  const [theme, toggleTheme] = useTheme();

  return (
    <NavBar
      Logo={Logo}
      sidebarItemTogglerAriaLabel="Toggle navigation menu"
      navItems={[]}
    >
      <SearchBox />
      <ThemeToggle
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      />
      <a
        href={`https://github.com/${STATIC_DATA.repository}`}
        aria-label={`${STATIC_DATA.title} GitHub`}
        className={styles.ghIconWrapper}
      >
        <GitHubIcon />
      </a>
    </NavBar>
  );
};
