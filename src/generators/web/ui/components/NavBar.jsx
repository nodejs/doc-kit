import NodejsLogo from '@node-core/ui-components/Common/NodejsLogo';
import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';
import NavBar from '@node-core/ui-components/Containers/NavBar';
import styles from '@node-core/ui-components/Containers/NavBar/index.module.css';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import SearchBox from './SearchBox';
import { useTheme } from '../hooks/useTheme.mjs';

/**
 * NavBar component that displays the headings, search, etc.
 */
export default () => {
  const [theme, toggleTheme] = useTheme();

  return (
    <NavBar
      Logo={NodejsLogo}
      sidebarItemTogglerAriaLabel="Toggle navigation menu"
      navItems={[]}
    >
      <SearchBox />
      <ThemeToggle
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      />
      <a
        href="https://github.com/nodejs/node"
        aria-label="Node.js Github"
        className={styles.ghIconWrapper}
      >
        <GitHubIcon />
      </a>
    </NavBar>
  );
};
