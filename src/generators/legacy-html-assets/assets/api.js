'use strict';

/**
 * Initialize all UI features
 */
const initFeatures = () => {
  // Add JavaScript support indicator
  document.documentElement.classList.add('has-js');

  setupTheme();
  setupPickers();
  setupStickyHeaders();
  setupAltDocsLink();
  setupFlavorToggles();
  setupCopyButton();
};

// Initialize either on DOMContentLoaded or immediately if already loaded
document.addEventListener('DOMContentLoaded', initFeatures);
if (document.readyState !== 'loading') initFeatures();

/**
 * Sets up theme toggling functionality
 */
const setupTheme = () => {
  const storedTheme = localStorage.getItem('theme');
  const themeToggleButton = document.getElementById('theme-toggle-btn');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');

  // Apply theme based on storage or system preference
  if (
    storedTheme === 'dark' ||
    (storedTheme === null && prefersDark?.matches)
  ) {
    document.documentElement.classList.add('dark-mode');
  }

  if (!themeToggleButton) return;

  themeToggleButton.hidden = false;

  // Setup system preference change listener
  if (
    storedTheme === null &&
    prefersDark &&
    'addEventListener' in prefersDark
  ) {
    const mqListener = e =>
      document.documentElement.classList.toggle('dark-mode', e.matches);
    prefersDark.addEventListener('change', mqListener);

    // Remove system preference listener on first manual toggle
    themeToggleButton.addEventListener(
      'click',
      () => {
        prefersDark.removeEventListener('change', mqListener);
      },
      { once: true }
    );
  }

  // Handle theme toggle clicks
  themeToggleButton.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
};

/**
 * Sets up dropdown picker functionality
 */
const setupPickers = () => {
  const pickers = document.querySelectorAll('.picker-header > a');
  if (!pickers.length) return;

  const closeAllPickers = () => {
    pickers.forEach(picker => {
      picker.parentNode.classList.remove('expanded');
      picker.ariaExpanded = false;
    });

    window.removeEventListener('click', closeAllPickers);
    window.removeEventListener('keydown', handleEscKey);
  };

  const handleEscKey = e => {
    if (e.key === 'Escape') closeAllPickers();
  };

  pickers.forEach(picker => {
    const parentNode = picker.parentNode;
    picker.ariaExpanded = parentNode.classList.contains('expanded');

    picker.addEventListener('click', e => {
      e.preventDefault();
      if (picker.ariaExpanded === 'true') return;

      requestAnimationFrame(() => {
        picker.ariaExpanded = true;
        parentNode.classList.add('expanded');
        window.addEventListener('click', closeAllPickers);
        window.addEventListener('keydown', handleEscKey);
        parentNode.querySelector('.picker a').focus();
      });
    });
  });
};

/**
 * Sets up sticky header behavior
 */
const setupStickyHeaders = () => {
  const header = document.querySelector('.header');
  if (!header) return;

  let ignoreNextIntersection = false;

  new IntersectionObserver(
    entries => {
      const currentPinned = header.classList.contains('is-pinned');
      const shouldPin = entries[0].intersectionRatio < 1;

      if (currentPinned === shouldPin) return;
      if (ignoreNextIntersection) {
        ignoreNextIntersection = false;
        return;
      }

      ignoreNextIntersection = true;
      setTimeout(() => (ignoreNextIntersection = false), 50);
      header.classList.toggle('is-pinned', shouldPin);
    },
    { threshold: [1] }
  ).observe(header);
};

/**
 * Sets up alternative docs link with hash synchronization
 */
const setupAltDocsLink = () => {
  const linkWrapper = document.getElementById('alt-docs');
  if (!linkWrapper) return;

  const updateHashes = () => {
    linkWrapper
      .querySelectorAll('a')
      .forEach(link => (link.hash = location.hash));
  };

  window.addEventListener('hashchange', updateHashes);
  updateHashes();
};

/**
 * Sets up flavor toggle functionality
 */
const setupFlavorToggles = () => {
  const toggles = document.querySelectorAll('.js-flavor-toggle');
  if (!toggles.length) return;

  const isCustomFlavorEnabled = localStorage.getItem('customFlavor') === 'true';

  toggles.forEach(toggle => {
    toggle.checked = isCustomFlavorEnabled;

    toggle.addEventListener('change', e => {
      const checked = e.target.checked;

      if (checked) {
        localStorage.setItem('customFlavor', 'true');
      } else {
        localStorage.removeItem('customFlavor');
      }

      toggles.forEach(el => (el.checked = checked));
    });
  });
};

/**
 * Sets up code copy button functionality
 */
const setupCopyButton = () => {
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', e => {
      const parent = e.target.parentNode;
      const flavorToggle = parent.querySelector('.js-flavor-toggle');

      let code;
      if (flavorToggle) {
        code = parent.querySelector(
          flavorToggle.checked ? '.mjs' : '.cjs'
        ).textContent;
      } else {
        code = parent.querySelector('code').textContent;
      }

      navigator.clipboard.writeText(code);

      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 2500);
    });
  });
};
