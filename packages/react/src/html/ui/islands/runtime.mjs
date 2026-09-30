import { Island } from '@11ty/is-land';
import { h, hydrate, render } from 'preact';

import loaders from './loaders.mjs';

/**
 * The islands hydrated so far. Exported so the router can save their scroll
 * positions before a navigation discards them, without querying the document.
 *
 * @type {Set<HTMLElement>}
 */
export const hydrated = new Set();

/**
 * The components loaded so far, by island name. Even an `import()` of a module
 * that has already loaded settles a task later, and so after the page has been
 * painted: a page navigated to client-side would show its islands before they
 * hydrate (the banner would pop in). Loaded components hydrate right away.
 *
 * @type {Map<string, import('preact').ComponentType>}
 */
const loaded = new Map();

/**
 * Adds the generator's component map to the registry.
 *
 * @param {Record<string, () => Promise<{ default: import('preact').ComponentType }>>} components
 */
export const registerIslands = components => Object.assign(loaders, components);

/**
 * Unmounts the hydrated islands inside `root`. Detaching their markup is not
 * enough: the components' effects would never be cleaned up, and the global
 * listeners they registered (the search box's `⌘ K`, the theme toggle's media
 * query) would pile up with every page navigated through.
 *
 * @param {Node} root
 */
export const unmountIslands = root => {
  for (const island of hydrated) {
    if (root.contains(island)) {
      render(null, island);
      hydrated.delete(island);
    }
  }
};

/**
 * Re-renders an island's server-rendered children as the markup they already
 * are. Preact keeps the existing DOM because the HTML is identical, so nothing
 * static ever has to be shipped as JavaScript.
 *
 * @param {{ html: string }} props
 */
const Slot = ({ html }) =>
  h('island-slot', { dangerouslySetInnerHTML: { __html: html } });

// Registered before any island can reach `beforeReady`: importing is-land above
// upgrades the elements already in the document, but `Island#hydrate` awaits its
// loading conditions first, and that await cannot resolve until this module body
// has run to completion.
Island.addInitType('preact', async island => {
  const name = island.getAttribute('data-island-name');
  const loader = loaders[name];

  if (!loader) {
    console.error(`[is-land] no component registered for "${name}"`);
    return;
  }

  const script = [...island.children].find(child =>
    child.matches('script[data-island-props]')
  );

  const props = script ? JSON.parse(script.textContent) : {};

  // Preact hydrates by walking the container's children in order, so the props
  // script has to go before the tree it describes is diffed against them.
  script?.remove();

  const slots = [...island.querySelectorAll('island-slot')].filter(
    slot => slot.closest('is-land') === island
  );

  if (slots.length) {
    props.children = slots.map(slot => h(Slot, { html: slot.innerHTML }));
  }

  try {
    if (!loaded.has(name)) {
      loaded.set(name, (await loader()).default);
    }

    // A client-side navigation can replace the page while its component loads
    if (!island.isConnected) {
      return;
    }

    hydrate(h(loaded.get(name), props), island);
    hydrated.add(island);
  } catch (error) {
    // is-land awaits this callback, so a rejection would leave the island
    // silently stuck: never marked ready, and never reported anywhere.
    console.error(`[is-land] "${name}" failed to hydrate`, error);
  }
});
