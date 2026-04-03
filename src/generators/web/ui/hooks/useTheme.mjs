import { useState, useEffect, useCallback } from 'react';

/** @returns {'dark'|'light'} The current OS-level color scheme. */
const getSystemTheme = () =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/**
 * Applies a theme to the document root.
 * Resolves 'system' to the actual OS preference before applying.
 * @param {'system'|'light'|'dark'} pref - The theme preference.
 */
const applyTheme = pref => {
  const theme = pref === 'system' ? getSystemTheme() : pref;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
};

/**
 * Applies the system theme to the document root.
 */
const applySystemTheme = () => applyTheme('system');

/**
 * React hook for managing theme preference.
 * Persists the choice to localStorage and listens for OS theme changes
 * when set to 'system'.
 * @returns {['system'|'light'|'dark', (next: 'system'|'light'|'dark') => void]}
 */
export const useTheme = () => {
  // Read stored preference once on mount; default to 'system'.
  const [pref, setPref] = useState(() =>
    SERVER ? 'system' : (localStorage.getItem('theme') ?? 'system')
  );

  // Apply theme on every preference change, and if 'system',
  // also listen for OS-level color scheme changes.
  useEffect(() => {
    applyTheme(pref);

    if (pref !== 'system') {
      return;
    }

    const mql = matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', applySystemTheme);
    return () => mql.removeEventListener('change', applySystemTheme);
  }, [pref]);

  /** Updates the preference in both React state and localStorage. */
  const setTheme = useCallback(next => {
    setPref(next);
    if (CLIENT) {
      localStorage.setItem('theme', next);
    }
  }, []);

  return [pref, setTheme];
};
