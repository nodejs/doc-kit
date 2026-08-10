import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';

import styles from './ThemeToggle.module.css';
import { useTheme } from '../hooks/useTheme.mjs';
import withIsland from '../islands/withIsland.jsx';

/**
 * Theme switcher.
 */
const Toggle = () => {
  const [themePreference, setThemePreference] = useTheme();

  return (
    <span
      className={styles.themeToggleWrapper}
      data-theme-preference={themePreference}
    >
      <ThemeToggle
        onChange={setThemePreference}
        currentTheme={themePreference}
      />

      {themePreference === 'system' && (
        <span className={styles.systemThemeIcon} aria-hidden="true">
          <SunIcon data-theme-icon="light" height="20" />
          <MoonIcon data-theme-icon="dark" height="20" />
        </span>
      )}
    </span>
  );
};

export default withIsland(Toggle, {
  name: 'ThemeToggle',
  on: { idle: true },
});
