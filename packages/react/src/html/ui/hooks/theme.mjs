/**
 * Resolves the theme preference that should be represented by the toggle icon.
 *
 * The selector still stores `system` as the user preference, but its trigger
 * should show the light or dark icon that is currently applied to the page.
 *
 * @param {'system'|'light'|'dark'} preference - The stored theme preference.
 * @param {boolean} systemSupportsDarkMode - Whether the OS currently prefers dark mode.
 * @returns {'light'|'dark'} The theme currently displayed by the page.
 */
export const getDisplayedTheme = (preference, systemSupportsDarkMode) => {
  if (preference === 'system') {
    return systemSupportsDarkMode ? 'dark' : 'light';
  }

  return preference;
};
