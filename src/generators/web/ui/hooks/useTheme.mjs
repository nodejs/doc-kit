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
   * Callback function to toggle between 'light' and 'dark' themes.
   */
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      // Determine the next theme based on the current theme.
      const next = prev === 'light' ? 'dark' : 'light';
      // Apply the new theme.
      applyTheme(next);
      // Return the new theme to update the state.
      return next;
    });
  }, []);

  return [theme, toggleTheme];
};
