import { PRESS_EVENTS } from '../constants.mjs';

/**
 * Holds the presses an island receives while its component loads, so they
 * can be replayed once it's ready (each once the innermost island around it
 * has hydrated). Only presses after loading started are held: the one that
 * started it has already been dispatched.
 *
 * @param {HTMLElement} island
 * @returns {() => void} Stops holding and replays what was held.
 */
export const holdPresses = island => {
  /** @type {Array<Event>} */
  const presses = [];

  /** @param {Event} event */
  const hold = event => {
    presses.push(event);

    // Only a click has a default action to hold back. Preventing a pointerdown
    // would also suppress the mouse events that follow it, and a mousedown its
    // focus and text selection.
    if (event.type === 'click') {
      event.preventDefault();
    }
  };

  for (const type of PRESS_EVENTS) {
    island.addEventListener(type, hold);
  }

  return () => {
    for (const type of PRESS_EVENTS) {
      island.removeEventListener(type, hold);
    }

    for (const event of presses) {
      const target = /** @type {Element} */ (event.target);

      target
        .closest('is-land')
        ?.wait()
        .then(() => {
          // A replayed click on a detached link would still follow it
          if (target.isConnected) {
            target.dispatchEvent(new event.constructor(event.type, event));
          }
        });
    }
  };
};
