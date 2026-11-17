import { PRESS_EVENTS } from '../constants.mjs';

/**
 * The press most recently dispatched in the document.
 *
 * @type {Event | undefined}
 */
let lastPress;

/**
 * Records each press as it starts dispatching, so that `holdPresses` can tell
 * the press that started an island loading.
 *
 * @param {EventTarget} root
 */
export const trackPresses = root => {
  for (const type of PRESS_EVENTS) {
    root.addEventListener(type, event => (lastPress = event), {
      capture: true,
    });
  }
};

/**
 * Holds the presses an island receives while its component loads, so they
 * can be replayed once it's ready (each once the innermost island around it
 * has hydrated). That includes the press that started loading it, such as
 * the click of `interaction: true`, which a mouse or the keyboard (Enter or
 * Space on a button) dispatches.
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

  // is-land starts loading from its own listener on the island, and this
  // runs in the microtasks right after it, while the press that triggered it
  // is still being dispatched (its phase is only `NONE` once it's done). The
  // listeners above are too late for that press, so it's held here.
  if (lastPress?.eventPhase && island.contains(lastPress.target)) {
    hold(lastPress);
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
