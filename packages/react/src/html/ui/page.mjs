/**
 * DOM utilities for client-side page swaps: fetching, parsing, and replacing
 * the document body and page-specific head elements.
 */

import { PAGE_HEAD } from './constants.mjs';

/**
 * @typedef {{ url: string, html: string }} Page A fetched page: its final
 * URL, after redirects, and its markup.
 */

/**
 * Fetches a page, returning its final URL and HTML, or `null` on failure or a
 * non-HTML response.
 *
 * @param {string} url
 * @returns {Promise<Page | null>}
 */
export const fetchPage = url =>
  fetch(url, { priority: 'low', headers: { Accept: 'text/html' } })
    .then(async response =>
      response.ok &&
      response.headers.get('content-type')?.startsWith('text/html')
        ? { url: response.url, html: await response.text() }
        : null
    )
    .catch(() => null);

/**
 * Keys an iterable of islands by name and occurrence, so that the same island
 * is found again on the next page.
 *
 * @param {Iterable<HTMLElement>} source
 * @returns {Map<string, HTMLElement>}
 */
export const keyIslands = source => {
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
export const transition = update => update();

/**
 * Parses a fetched page and checks that its assets match this build.
 * Returns `null` when the page belongs to a different build (e.g. after a
 * new deploy) and only a full load can show it.
 *
 * @param {Page} page
 * @param {Set<string>} assets - Absolute hrefs of this build's scripts and stylesheets
 * @returns {Document | null}
 */
export const parsePage = ({ url, html }, assets) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tag = doc.querySelector('script[data-router]');

  if (!tag) {
    return null;
  }

  /** @type {{ root: string, assets: Array<string> }} */
  const pageConfig = JSON.parse(tag.textContent);

  return pageConfig.assets
    .map(asset => new URL(asset, url))
    .every(({ href }) => assets.has(href))
    ? doc
    : null;
};

/**
 * Swaps the current page for another, preserving island scroll positions.
 *
 * @param {Document} doc - The next page
 * @param {() => void} scroll - Scrolls to where the navigation leads
 * @param {(root: Node) => void} unmount - Unmounts islands before the swap
 * @param {Set<HTMLElement>} islands - The hydrated islands to save scroll for
 */
export const showPage = (doc, scroll, unmount, islands) => {
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
