import { useState, useEffect, useCallback } from 'react';

/**
 * Applies the given theme to the `<html>` element's `data-theme` attribute
 * and persists the theme preference in `localStorage`.
 *
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
const applyTheme = theme => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('theme', theme);
};

/**
 * A React hook for managing the application's light/dark theme.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initial =
      // Try to get the theme from localStorage first.
      localStorage.getItem('theme') ||
      // If not found, check the `data-theme` attribute on the document element
      document.documentElement.getAttribute('data-theme') ||
      // As a final fallback, check the user's system preference for dark mode.
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    applyTheme(initial);
    setTheme(initial);
  }, []);

  /**
   * Callback function to change the theme.
   */
  const changeTheme = useCallback(newTheme => {
    setTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  return [theme, changeTheme];
};
