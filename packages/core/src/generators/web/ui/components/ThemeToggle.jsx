import ThemeToggle from '@node-core/ui-components/Common/ThemeToggle';

import { useTheme } from '../hooks/useTheme.mjs';
import withIsland from '../islands/withIsland.jsx';

/**
 * Theme switcher.
 */
const Toggle = () => {
  const [themePreference, setThemePreference] = useTheme();

  return (
    <ThemeToggle onChange={setThemePreference} currentTheme={themePreference} />
  );
};

export default withIsland(Toggle, {
  name: 'ThemeToggle',
  on: { idle: true },
});
