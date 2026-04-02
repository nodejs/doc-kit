import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';
import NavBar from '@node-core/ui-components/Containers/NavBar';
import styles from '@node-core/ui-components/Containers/NavBar/index.module.css';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import SearchBox from './SearchBox';
import { useTheme } from '../hooks/useTheme.mjs';

import { repository } from '#theme/config';
import Logo from '#theme/Logo';

/**
 * NavBar component that displays the headings, search, etc.
 */
export default ({ metadata }) => {
  const [themePreference, setThemePreference] = useTheme();

  return (
    <NavBar
      Logo={Logo}
      sidebarItemTogglerAriaLabel="Toggle navigation menu"
      navItems={[]}
    >
      <SearchBox pathname={metadata.path} />
      <ThemeToggle
        onChange={setThemePreference}
        currentTheme={themePreference}
      />
      <a
        href={`https://github.com/${repository}`}
        aria-label={repository}
        className={styles.ghIconWrapper}
      >
        <GitHubIcon />
      </a>
    </NavBar>
  );
};
