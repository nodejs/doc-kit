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

/**
 * @typedef {{ url: string, html: string }} Page A fetched page: its final
 * URL, after redirects, and its markup.
 */

// How long a hovered link waits before its page is prefetched, so that links
// the pointer merely crosses on its way somewhere else are skipped.
const HOVER_DELAY = 80;

// How long a fetched page is reused for, whether it was prefetched or visited.
const PAGE_LIFETIME = 5 * 60 * 1000;

// How many fetched pages are kept at once.
const MAX_PAGES = 10;

// The `<head>` elements that belong to the page rather than to the site, and
// are replaced with it: `<meta>` tags (`og:title`) and the links that are not
// resources (`canonical`). Scripts and stylesheets run and apply once.
const PAGE_HEAD =
  ':scope > meta, :scope > link:not([rel~="stylesheet"], [rel~="preload"], [rel~="modulepreload"])';

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
 * The absolute URLs of the scripts and stylesheets a document loads.
 *
 * @param {Document} doc
 * @param {string} base - The document's URL, for relative references
 * @returns {Array<URL>}
 */
const getAssets = (doc, base) =>
  [...doc.querySelectorAll('script[src], link[rel~="stylesheet"][href]')].map(
    element =>
      new URL(element.getAttribute('src') ?? element.getAttribute('href'), base)
  );

/**
 * Keys an iterable of islands by name and occurrence, so that the same island
 * is found again on the next page.
 *
 * @param {Iterable<HTMLElement>} source
 * @returns {Map<string, HTMLElement>}
 */
const keyIslands = source => {
  const counts = new Map();

  return new Map(
    [...source].map(island => {
      const name = island.getAttribute('data-island-name');
      counts.set(name, (counts.get(name) ?? 0) + 1);

      return [`${name}:${counts.get(name)}`, island];
    })
  );
};

/**
 * Replaces the page-specific `<head>` elements with the next page's, leaving
 * the ones both pages share in place.
 *
 * @param {Document} doc - The next page
 */
const updateHead = doc => {
  document.title = doc.title;

  const next = new Map(
    [...doc.head.querySelectorAll(PAGE_HEAD)].map(element => [
      element.outerHTML,
      element,
    ])
  );

  for (const element of document.head.querySelectorAll(PAGE_HEAD)) {
    // What is left in `next` afterwards is what the current page lacks
    if (!next.delete(element.outerHTML)) {
      element.remove();
    }
  }

  document.head.append(...next.values());
};

/**
 * Runs a DOM update, keeping the call-site uniform for a future transition.
 *
 * @param {() => void} update
 */
const transition = update => update();

/**
 * Starts handling navigations between the pages of the site, unless the
 * browser lacks the Navigation API or the page does not say where the site
 * starts (see `buildAssetTags`).
 *
 * @param {object} options
 * @param {(root: Node) => void} options.unmount - Unmounts the components
 * rendered inside the part of the document that is about to be discarded.
 * @param {Set<HTMLElement>} options.islands - The runtime's set of hydrated
 * islands; used to save scroll positions before the body is replaced.
 */
export const startRouter = ({ unmount, islands }) => {
  const script = document.querySelector('script[data-root]');

  if (!('navigation' in window) || !script) {
    return;
  }

  const root = new URL(script.dataset.root, location.href).href;

  // The document's head is never replaced (see `PAGE_HEAD`), so the relative
  // URLs in it are resolved while they still point where they did at load
  const assets = new Set(
    getAssets(document, location.href).map(url => url.href)
  );

  /** @type {Map<string, { page: Promise<Page | null>, expires: number }>} */
  const pages = new Map();

  /**
   * Fetches a page, or reuses the copy fetched moments ago.
   *
   * @param {string} url - The page's URL, without a fragment
   * @returns {Promise<Page | null>} `null` when the response is not a page to
   * show: an error, or anything but HTML.
   */
  const loadPage = url => {
    const cached = pages.get(url);

    if (cached && cached.expires > Date.now()) {
      return cached.page;
    }

    const page = fetch(url)
      .then(async response =>
        response.ok &&
        response.headers.get('content-type')?.startsWith('text/html')
          ? { url: response.url, html: await response.text() }
          : null
      )
      .catch(() => null);

    pages.delete(url);
    pages.set(url, { page, expires: Date.now() + PAGE_LIFETIME });

    if (pages.size > MAX_PAGES) {
      pages.delete(pages.keys().next().value);
    }

    // A failure is not kept, so the next attempt fetches again
    page.then(result => {
      if (!result && pages.get(url)?.page === page) {
        pages.delete(url);
      }
    });

    return page;
  };

  /**
   * Parses a page, unless it loads scripts or stylesheets this document does
   * not have: it comes from another build (such as a newer deployment), and
   * only a full load can show it.
   *
   * @param {Page} page
   * @returns {Document | null}
   */
  const parsePage = ({ url, html }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    return getAssets(doc, url).every(asset => assets.has(asset.href))
      ? doc
      : null;
  };

  /**
   * Swaps the current page for another.
   *
   * @param {Document} doc - The next page
   * @param {() => void} scroll - Scrolls to where the navigation leads
   */
  const showPage = (doc, scroll) => {
    // The sidebar (like any island that scrolls) stays where it was
    const scrolled = [...keyIslands(islands)]
      .filter(([, island]) => island.scrollTop || island.scrollLeft)
      .map(([key, { scrollLeft, scrollTop }]) => [key, scrollLeft, scrollTop]);

    unmount(document.body);
    updateHead(doc);
    document.body.replaceWith(doc.body);

    // Styles can then keep what animates in as the site loads (the banner)
    // from animating again with every page
    document.documentElement.setAttribute('data-navigated', '');

    const next = keyIslands(
      document.body.querySelectorAll('is-land[data-island-name]')
    );

    for (const [key, left, top] of scrolled) {
      next.get(key)?.scrollTo({ left, top, behavior: 'instant' });
    }

    scroll();
  };

  /**
   * The page a link leads to, when following it would be handled here.
   *
   * @param {EventTarget | null} target - The link, or an element inside it
   * @returns {string | undefined} The page's URL, without a fragment
   */
  const getLinkedPage = target => {
    const link = target instanceof Element ? target.closest('a[href]') : null;

    if (
      !(link instanceof HTMLAnchorElement) ||
      link.hasAttribute('download') ||
      (link.target && link.target !== '_self')
    ) {
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

    if (
      !event.canIntercept ||
      event.hashChange ||
      event.downloadRequest !== null ||
      event.formData ||
      event.navigationType === 'reload' ||
      !isPage(url, root)
    ) {
      return;
    }

    event.intercept({
      // Scrolling waits for the page to be swapped in (see `showPage`)
      scroll: 'manual',

      /**
       * Swaps in the page the navigation leads to.
       */
      async handler() {
        const page = await loadPage(withoutFragment(url.href));

        if (event.signal.aborted) {
          return;
        }

        const doc = page && parsePage(page);

        if (!doc) {
          // The navigation has already moved to the page's URL, so reloading
          // is a full load of that page
          location.reload();

          return;
        }

        transition(() => showPage(doc, () => event.scroll()));
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
        hovered = setTimeout(loadPage, HOVER_DELAY, url);
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
