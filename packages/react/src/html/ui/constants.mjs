/** How long a hovered link waits before its page is prefetched. */
export const ROUTER_HOVER_DELAY = 80;

/** How long a fetched page is kept for reuse, whether prefetched or visited. */
export const ROUTER_PAGE_LIFETIME = 5 * 60 * 1000;

/** How many fetched pages are kept at once. */
export const ROUTER_MAX_PAGES = 10;

/**
 * The attribute of the `<script type="application/json">` tag that carries the
 * router data of a page (see `buildAssetTags`).
 */
export const ROUTER_DATA_ATTRIBUTE = 'data-router';

/**
 * The pathname of a page of the site: an HTML file, or an extensionless path
 * (hosts may serve pages without their `.html`), and not one of the site's
 * other files (JSON, Markdown, the search index).
 */
export const PAGE_PATHNAME = /(\.html|\/[^./]*)$/;

/**
 * The `<head>` elements that belong to the page rather than to the site, and
 * are replaced with it: `<meta>` tags (`og:title`) and the links that are not
 * resources (`canonical`). Scripts and stylesheets run and apply once.
 */
export const PAGE_HEAD =
  ':scope > meta, :scope > link:not([rel~="stylesheet"], [rel~="preload"], [rel~="modulepreload"])';

/** The attribute naming the component an island renders (see `withIsland`). */
export const ISLAND_NAME_ATTRIBUTE = 'data-island-name';

/**
 * The attribute set on `<html>` once a page has been navigated to client-side,
 * so that styles can keep what animates in as the site loads (the banner) from
 * animating again with every page.
 */
export const NAVIGATED_ATTRIBUTE = 'data-navigated';
