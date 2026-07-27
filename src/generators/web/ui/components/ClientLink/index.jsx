/**
 * ClientLink – zero-reload navigation for doc-kit static sites.
 *
 * How it works:
 *   1. Intercepts clicks on internal `<a>` links (via the component AND
 *      a global event-delegation listener so links inside swapped DOM
 *      keep working).
 *   2. Fetches the target page's HTML in the background.
 *   3. Replaces `#root` innerHTML with the new page's `#root` content,
 *      preserving the already-loaded CSS / JS assets in `<head>`.
 *   4. Saves & restores the sidebar (`<aside>`) scroll position in a
 *      plain JS variable – no sessionStorage / localStorage needed.
 *   5. Handles browser Back / Forward buttons via `popstate`.
 *
 * @module ClientLink
 */

// ---------------------------------------------------------------------------
// State kept in module scope (survives DOM replacements, no storage needed)
// ---------------------------------------------------------------------------
let sidebarScrollTop = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `href` points to an internal page that can be navigated
 * client-side (same-origin, not a hash-only link, not a special protocol).
 *
 * @param {string | undefined | null} href
 * @returns {boolean}
 */
const isInternalLink = href => {
  if (!href) {
    return false;
  }
  if (/^(https?:|mailto:|tel:|#)/.test(href)) {
    return false;
  }
  return true;
};

/**
 * Returns true when the click event carries modifier keys that signal
 * "open in new tab / window" – we should let the browser handle those.
 */
const hasModifier = e =>
  e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

// ---------------------------------------------------------------------------
// Core navigation function
// ---------------------------------------------------------------------------

/**
 * Perform client-side navigation to `url` without a full page reload.
 *
 * @param {string}  url
 * @param {boolean} [isPopState=false] – true when triggered by Back/Forward
 */
export const navigate = async (url, isPopState = false) => {
  // 1. Save sidebar scroll position BEFORE touching the DOM
  const sidebar = document.querySelector('aside');
  if (sidebar) {
    sidebarScrollTop = sidebar.scrollTop;
  }

  // 2. Push browser history (skip for popstate – browser already did it)
  if (!isPopState) {
    window.history.pushState({}, '', url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const newDoc = new DOMParser().parseFromString(html, 'text/html');

    const currentRoot = document.getElementById('root');
    const newRoot = newDoc.getElementById('root');

    if (currentRoot && newRoot) {
      // 3. Swap the entire #root – all CSS module classes are preserved
      //    because they come straight from the server-rendered HTML and
      //    the shared styles.css is already loaded in <head>.
      const updateDOM = () => {
        currentRoot.innerHTML = newRoot.innerHTML;
        document.title = newDoc.title;

        // 4. Restore sidebar scroll position
        const newSidebar = document.querySelector('aside');
        if (newSidebar) {
          newSidebar.scrollTop = sidebarScrollTop;
        }

        // 5. Scroll to hash target if URL contains a hash, otherwise to top
        const hash = new URL(url, window.location.origin).hash;
        if (hash) {
          const target = document.getElementById(hash.slice(1));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      };

      // Use View Transitions API for a smooth crossfade when available
      if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
      } else {
        updateDOM();
      }
    } else {
      // Fallback: full page navigation
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
};

// Global event delegation (attached once, survives any DOM replacement)
if (typeof window !== 'undefined' && !window.__dockit_client_nav) {
  window.__dockit_client_nav = true;

  // Handle clicks on ANY <a> inside the page – even ones injected via
  // innerHTML replacement – so navigation keeps working after a swap.
  document.addEventListener('click', e => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (hasModifier(e)) {
      return;
    }

    // Handle hash-only links (#heading-id) manually because native hash
    // navigation can break after innerHTML swap of #root
    if (href && href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState({}, '', href);
      }
      return;
    }

    if (!isInternalLink(href)) {
      return;
    }

    e.preventDefault();
    navigate(href);
  });

  // Handle browser Back / Forward buttons
  window.addEventListener('popstate', () => {
    navigate(window.location.href, true);
  });
}

export default function ClientLink({ children, ...props }) {
  return <a {...props}>{children}</a>;
}
