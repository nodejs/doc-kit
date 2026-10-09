/**
 * Client-side navigation between the pages of the site, on top of the
 * Navigation API.
 *
 * Following a link to another page fetches that page and swaps it into the
 * current document instead of loading a new one: the scripts, stylesheets and
 * fonts stay loaded, the data shared by every page (the search index, the
 * remote config) stays in memory, and the sidebar keeps its scroll position.
 * The Navigation API supplies everything else a real navigation does: history
 * entries, back and forward, scroll restoration, focus reset, the browser's
 * loading indicator, and aborting a navigation another one supersedes.
 *
 * Pages are prefetched into memory when a link is hovered or pressed, so most
 * navigations never wait on the network.
 *
 * Everything else is left to the browser: links to other sites, to other
 * builds (another version of the docs), to files that are not pages, and every
 * navigation in a browser without the Navigation API.
 */

import {
  ROUTER_HOVER_DELAY,
  ROUTER_MAX_PAGES,
  ROUTER_PAGE_LIFETIME,
} from './constants.mjs';
import { fetchPage, parsePage, showPage, transition } from './page.mjs';

/**
 * Whether a URL is a page of the site under `root`: an HTML file, or an
 * extensionless path (hosts may serve pages without their `.html`), and not
 * one of the site's other files (JSON, Markdown, the search index).
 *
 * @param {URL} url
 * @param {string} root - The site's root URL, ending in `/`
 */
export const isPage = (url, root) =>
  url.href.startsWith(root) && /(\.html|\/[^./]*)$/.test(url.pathname);

/**
 * A URL without its fragment: the address of the page it points into.
 *
 * @param {string} href
 */
export const withoutFragment = href => href.split('#')[0];

/**
 * Whether a link element is one the router can follow: an anchor that does
 * not trigger a download and does not open in another browsing context.
 *
 * @param {Element | null} link
 * @returns {link is HTMLAnchorElement}
 */
export const shouldFollowLink = link =>
  link instanceof HTMLAnchorElement &&
  !link.hasAttribute('download') &&
  (!link.target || link.target === '_self');

/**
 * Whether a navigation event should be intercepted by the router.
 *
 * @param {NavigateEvent} event
 * @param {URL} url
 * @param {string} root
 */
const shouldIntercept = (event, url, root) =>
  event.canIntercept &&
  !event.hashChange &&
  event.downloadRequest === null &&
  !event.formData &&
  event.navigationType !== 'reload' &&
  isPage(url, root);

/**
 * Starts handling navigations between the pages of the site, unless the
 * browser lacks the Navigation API or the page does not carry router data
 * (see `buildAssetTags`).
 *
 * @param {object} options
 * @param {(root: Node) => void} options.unmount - Unmounts the components
 * rendered inside the part of the document that is about to be discarded.
 * @param {Set<HTMLElement>} options.islands - The runtime's set of hydrated
 * islands; used to save scroll positions before the body is replaced.
 */
export const startRouter = ({ unmount, islands }) => {
  const tag = document.querySelector('script[data-router]');

  if (!('navigation' in window) || !tag) {
    return;
  }

  /** @type {{ root: string, assets: Array<string> }} */
  const config = JSON.parse(tag.textContent);
  const { href: root } = new URL(config.root, location.href);
  const assets = new Set(
    config.assets
      .map(asset => new URL(asset, location.href))
      .map(({ href }) => href)
  );

  /** @type {Map<string, { page: Promise<import('./page.mjs').Page | null>, expires: number }>} */
  const pages = new Map();

  /**
   * Fetches a page, or reuses the copy fetched moments ago.
   *
   * @param {string} url - The page's URL, without a fragment
   * @returns {Promise<import('./page.mjs').Page | null>} `null` when the
   * response is not a page to show: an error, or anything but HTML.
   */
  const loadPage = url => {
    const cached = pages.get(url);

    if (cached && cached.expires > Date.now()) {
      return cached.page;
    }

    const page = fetchPage(url);
    const entry = { page, expires: Date.now() + ROUTER_PAGE_LIFETIME };

    pages.delete(url);
    pages.set(url, entry);

    // Redirected pages take two entries (below)
    while (pages.size > ROUTER_MAX_PAGES) {
      pages.delete(pages.keys().next().value);
    }

    page.then(result => {
      // A failure is not kept, so the next attempt fetches again
      if (!result && pages.get(url)?.page === page) {
        pages.delete(url);
      }

      // Following the redirect (see the handler) then needs no second fetch
      if (result && result.url !== url) {
        pages.set(result.url, entry);
      }
    });

    return page;
  };

  /**
   * The page a link leads to, when following it would be handled here.
   *
   * @param {EventTarget | null} target - The link, or an element inside it
   * @returns {string | undefined} The page's URL, without a fragment
   */
  const getLinkedPage = target => {
    const link = target instanceof Element ? target.closest('a[href]') : null;

    if (!shouldFollowLink(link)) {
      return;
    }

    const url = withoutFragment(link.href);

    // Links within the current page have nothing to fetch
    if (isPage(new URL(url), root) && url !== withoutFragment(location.href)) {
      return url;
    }
  };

  navigation.addEventListener('navigate', event => {
    const url = new URL(event.destination.url);

    if (!shouldIntercept(event, url, root)) {
      return;
    }

    const href = withoutFragment(url.href);
    const loading = loadPage(href);

    /**
     * Holds the URL back until the page arrives, then moves it straight to
     * the one the page was served from: hosts with clean URLs redirect
     * `fs.html` to `fs`, and a full load shows `fs` without `fs.html` first.
     *
     * @param {NavigationPrecommitController} controller
     */
    const precommitHandler = async controller => {
      const page = await loading;

      if (page && page.url !== href) {
        controller.redirect(page.url + url.hash);
      }
    };

    event.intercept({
      // Traversals go back to URLs shown already, which cannot be redirected
      precommitHandler:
        event.navigationType === 'traverse' ? undefined : precommitHandler,

      // Scrolling waits for the page to be swapped in (see `showPage` in page.mjs)
      scroll: 'manual',

      /**
       * Swaps in the page the navigation leads to.
       */
      async handler() {
        const page = await loading;

        if (event.signal.aborted) {
          return;
        }

        // Browsers without `precommitHandler` (Safari) show the link's URL
        // right away: follow the redirect from there, replacing its entry
        if (page && page.url !== withoutFragment(location.href)) {
          navigation.navigate(page.url + url.hash, { history: 'replace' });

          return;
        }

        const doc = page && parsePage(page, assets);

        if (!doc) {
          // The navigation has already moved to the page's URL, so reloading
          // is a full load of that page
          location.reload();

          return;
        }

        transition(() => showPage(doc, () => event.scroll(), unmount, islands));
      },
    });
  });

  let hovered;

  document.addEventListener(
    'pointerover',
    ({ pointerType, target }) => {
      clearTimeout(hovered);

      const url =
        pointerType === 'mouse' &&
        !navigator.connection?.saveData &&
        getLinkedPage(target);

      if (url) {
        hovered = setTimeout(loadPage, ROUTER_HOVER_DELAY, url);
      }
    },
    { passive: true }
  );

  document.addEventListener('pointerout', () => clearTimeout(hovered), {
    passive: true,
  });

  // Pressing a link is as good as following it: fetch right away
  document.addEventListener(
    'pointerdown',
    ({ target }) => {
      const url = getLinkedPage(target);

      if (url) {
        loadPage(url);
      }
    },
    { passive: true }
  );
};
