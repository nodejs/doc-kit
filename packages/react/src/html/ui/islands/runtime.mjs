import { Island } from '@11ty/is-land';
import { h, hydrate } from 'preact';

import loaders from './loaders.mjs';

/**
 * Adds the generator's component map to the registry.
 *
 * @param {Record<string, () => Promise<{ default: import('preact').ComponentType }>>} components
 */
export const registerIslands = components => Object.assign(loaders, components);

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
    const { default: Component } = await loader();

    hydrate(h(Component, props), island);
  } catch (error) {
    // is-land awaits this callback, so a rejection would leave the island
    // silently stuck: never marked ready, and never reported anywhere.
    console.error(`[is-land] "${name}" failed to hydrate`, error);
  }
});
