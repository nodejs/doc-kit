import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';
import { useEffect } from 'react';

import { useTheme } from '../hooks/useTheme.mjs';
import withIsland from '../islands/withIsland.jsx';

const themeLabels = {
  system: 'System',
  light: 'Light ⌘+L',
  dark: 'Dark ⌘+D',
};

/**
 * Maps shortcut keys (used with ⌘/Ctrl) to the theme preference they select.
 * @type {Record<string, 'light'|'dark'>}
 */
const themeShortcuts = {
  l: 'light',
  d: 'dark',
};

/**
 * Theme switcher.
 */
const Toggle = () => {
  const [themePreference, setThemePreference] = useTheme();

  useEffect(() => {
    /**
     * Switches the theme when a registered shortcut is pressed.
     * @param {KeyboardEvent} event
     */
    const onKeyDown = event => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) {
        return;
      }

      const nextTheme = themeShortcuts[event.key.toLowerCase()];
      if (!nextTheme) {
        return;
      }

      event.preventDefault();
      setThemePreference(nextTheme);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setThemePreference]);

  return (
    <ThemeToggle
      onChange={setThemePreference}
      currentTheme={themePreference}
      themeLabels={themeLabels}
    />
  );
};

export default withIsland(Toggle, {
  name: 'ThemeToggle',
  on: { idle: true },
});
