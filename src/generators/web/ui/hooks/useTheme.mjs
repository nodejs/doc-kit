import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'theme';
const THEME_PREFERENCES = new Set(['system', 'light', 'dark']);

/**
 *
 */
const getSystemTheme = () =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/**
 *
 */
const getStoredThemePreference = () => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.has(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
};

/**
 *
 */
const setStoredThemePreference = themePreference => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  } catch {
    // Ignore storage failures and keep non-persistent in-memory preference.
  }
};

/**
 * Applies a theme preference to the document.
 *
 * The persisted preference can be 'system', but the applied document theme is
 * always resolved to either 'light' or 'dark'.
 *
 * @param {'system'|'light'|'dark'} themePreference - Theme preference.
 */
const applyThemePreference = themePreference => {
  const resolvedTheme =
    themePreference === 'system' ? getSystemTheme() : themePreference;

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.style.colorScheme = resolvedTheme;
};

/**
 * A React hook for managing the application's theme preference.
 */
export const useTheme = () => {
  const [themePreference, setThemePreferenceState] = useState('system');

  useEffect(() => {
    // Use persisted preference if available, otherwise default to system.
    const initialPreference = getStoredThemePreference() || 'system';

    applyThemePreference(initialPreference);
    setThemePreferenceState(initialPreference);
  }, []);

  /**
   * Keep the resolved document theme in sync with system changes
   * whenever the preference is set to 'system'.
   */
  useEffect(() => {
    if (themePreference !== 'system') {
      return;
    }

    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)');
    /**
     *
     */
    const handleSystemThemeChange = () => applyThemePreference('system');

    if ('addEventListener' in mediaQueryList) {
      mediaQueryList.addEventListener('change', handleSystemThemeChange);
      return () => {
        mediaQueryList.removeEventListener('change', handleSystemThemeChange);
      };
    }

    mediaQueryList.addListener(handleSystemThemeChange);
    return () => {
      mediaQueryList.removeListener(handleSystemThemeChange);
    };
  }, [themePreference]);

  /**
   * Updates the theme preference and applies it immediately.
   */
  const setThemePreference = useCallback(nextPreference => {
    if (!THEME_PREFERENCES.has(nextPreference)) {
      return;
    }

    setThemePreferenceState(nextPreference);
    setStoredThemePreference(nextPreference);
    applyThemePreference(nextPreference);
  }, []);

  return [themePreference, setThemePreference];
};
