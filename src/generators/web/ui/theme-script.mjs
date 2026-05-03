'use strict';

/**
 * This script is designed to be inlined in the <head> of the HTML template.
 * It must execute BEFORE the body renders to prevent a Flash of Unstyled Content (FOUC).
 */
function initializeTheme() {
  var THEME_STORAGE_KEY = 'theme';
  var THEME_DATA_ATTRIBUTE = 'data-theme';
  var DARK_QUERY = '(prefers-color-scheme: dark)';

  var savedUserPreference = localStorage.getItem(THEME_STORAGE_KEY);
  var systemSupportsDarkMode = window.matchMedia(DARK_QUERY).matches;

  var shouldApplyDark =
    savedUserPreference === 'dark' ||
    (savedUserPreference === 'system' && systemSupportsDarkMode) ||
    (!savedUserPreference && systemSupportsDarkMode);

  var themeToApply = shouldApplyDark ? 'dark' : 'light';

  document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, themeToApply);
  document.documentElement.style.colorScheme = themeToApply;
}

export var THEME_SCRIPT = `(${initializeTheme.toString()})();`;
