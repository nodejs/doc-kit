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
  PAGE_PATHNAME,
  ROUTER_DATA_ATTRIBUTE,
  ROUTER_HOVER_DELAY,
  ROUTER_MAX_PAGES,
  ROUTER_PAGE_LIFETIME,
} from './constants.mjs';
import { fetchPage, parsePage, showPage } from './page.mjs';

/**
 * Whether a URL is a page of the site under `root` (see `PAGE_PATHNAME`).
 *
 * @param {URL | HTMLAnchorElement} url - A URL, or a link to one
 * @param {string} root - The site's root URL, ending in `/`
 */
export const isPage = (url, root) =>
  url.href.startsWith(root) && PAGE_PATHNAME.test(url.pathname);

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
  const tag = document.querySelector(`script[${ROUTER_DATA_ATTRIBUTE}]`);

  if (!('navigation' in window) || !tag) {
    return;
  }

  // The site's root and this build's assets, relative to this page
  /** @type {{ root: string, assets: Array<string> }} */
  const config = JSON.parse(tag.textContent);
  const { href: root } = new URL(config.root, location.href);
  const assets = new Set(
    config.assets
      .map(asset => new URL(asset, location.href))
      .map(({ href }) => href)
  );

  /**
   * @typedef {object} Entry A fetched page, kept for reuse.
   * @property {Promise<import('./page.mjs').Page | null>} page
   * @property {ReturnType<typeof setTimeout>} [expiry] - Drops the page once
   * it is too old to reuse
   */

  /**
   * The pages fetched lately, by URL, oldest first. A page the host redirected
   * is kept under the URL it was fetched from as well.
   *
   * @type {Map<string, Entry>}
   */
  const pages = new Map();

  /**
   * Drops a page from memory, under every URL it is kept under.
   *
   * @param {Entry} entry
   */
  const forget = entry => {
    // A pending expiry would otherwise hold on to the page until it runs
    clearTimeout(entry.expiry);

    for (const [href, kept] of pages) {
      if (kept === entry) {
        pages.delete(href);
      }
    }
  };

  /**
   * Fetches a page, or reuses the copy fetched moments ago.
   *
   * @param {string} href - The page's URL, without a fragment
   * @returns {Promise<import('./page.mjs').Page | null>} `null` when the
   * response is not a page to show: an error, or anything but HTML.
   */
  const loadPage = href => {
    const cached = pages.get(href);

    if (cached) {
      return cached.page;
    }

    /** @type {Entry} */
    const entry = { page: fetchPage(href) };

    entry.expiry = setTimeout(forget, ROUTER_PAGE_LIFETIME, entry);
    pages.set(href, entry);

    // The limit counts pages, not the URLs they are kept under
    const kept = new Set(pages.values());

    if (kept.size > ROUTER_MAX_PAGES) {
      forget(kept.values().next().value);
    }

    entry.page.then(result => {
      if (!result) {
        // A failure is not kept, so the next attempt fetches again
        forget(entry);
      } else if (result.url !== href && pages.get(href) === entry) {
        // Following the redirect (see the handler) then needs no second fetch
        pages.delete(result.url);
        pages.set(result.url, entry);
      }
    });

    return entry.page;
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

    const href = withoutFragment(link.href);

    // Links within the current page have nothing to fetch
    if (isPage(link, root) && href !== withoutFragment(location.href)) {
      return href;
    }
  };

  navigation.addEventListener(
    'navigate',
    /**
     * Takes over a navigation to another page of the site, to swap that page
     * into the current document.
     *
     * @param {NavigateEvent} event
     */
    event => {
      const destination = new URL(event.destination.url);

      if (!shouldIntercept(event, destination, root)) {
        return;
      }

      const href = withoutFragment(destination.href);
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
          controller.redirect(page.url + destination.hash);
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
            navigation.navigate(page.url + destination.hash, {
              history: 'replace',
            });

            return;
          }

          const doc = page && parsePage(page, assets);

          if (!doc) {
            // The navigation has already moved to the page's URL, so reloading
            // is a full load of that page
            location.reload();

            return;
          }

          showPage(doc, () => event.scroll(), unmount, islands);
        },
      });
    }
  );

  let hovered;

  document.addEventListener(
    'pointerover',
    /**
     * Prefetches the page a link leads to once the mouse has rested on it,
     * unless the browser is set to save data.
     */
    ({ pointerType, target }) => {
      clearTimeout(hovered);

      const href =
        pointerType === 'mouse' &&
        !navigator.connection?.saveData &&
        getLinkedPage(target);

      if (href) {
        hovered = setTimeout(loadPage, ROUTER_HOVER_DELAY, href);
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'pointerout',
    /**
     * Cancels the prefetch of a link the mouse leaves before its delay.
     */
    () => clearTimeout(hovered),
    { passive: true }
  );

  document.addEventListener(
    'pointerdown',
    /**
     * Fetches the page a pressed link leads to right away: pressing a link is
     * as good as following it.
     */
    ({ target }) => {
      const href = getLinkedPage(target);

      if (href) {
        loadPage(href);
      }
    },
    { passive: true }
  );
};
