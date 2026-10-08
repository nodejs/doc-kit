// How long a hovered link waits before its page is prefetched.
export const ROUTER_HOVER_DELAY = 80;

// How long a fetched page is reused for, whether prefetched or visited.
export const ROUTER_PAGE_LIFETIME = 5 * 60 * 1000;

// How many fetched pages are kept at once.
export const ROUTER_MAX_PAGES = 10;

// The `<head>` elements that belong to the page rather than to the site, and
// are replaced with it: `<meta>` tags (`og:title`) and the links that are not
// resources (`canonical`). Scripts and stylesheets run and apply once.
export const PAGE_HEAD =
  ':scope > meta, :scope > link:not([rel~="stylesheet"], [rel~="preload"], [rel~="modulepreload"])';
