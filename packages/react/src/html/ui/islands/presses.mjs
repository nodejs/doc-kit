/**
 * The events of a click or a tap, or of a touch the browser cancels to scroll.
 */
export const PRESS_EVENTS = [
  'pointerdown',
  'mousedown',
  'pointerup',
  'mouseup',
  'click',
  'pointercancel',
];

/**
 * Holds on to the presses an island receives until its component has loaded.
 *
 * An island that hydrates on interaction starts loading its component once one
 * of its events reaches it, and a press that follows can land before the
 * component is there to handle it. The returned function dispatches those
 * presses again, each once the innermost island around it is ready, as a press
 * inside a nested island needs that island hydrated too. A held click's default
 * action, such as following a link, waits for its replay.
 *
 * Only presses dispatched after loading has started are held, as the event that
 * started it has already reached the island by then. With is-land's default
 * `click,touchstart`, the click that hydrates an island is never handled, and a
 * tap replays its click but not its `pointerdown`. An island that has to handle
 * its first press hydrates on `pointerover,focusin,touchstart` instead, as
 * `CodeBox` and `CodeTabs` do.
 *
 * Replays are untrusted copies dispatched after the gesture has ended: they
 * can't capture the pointer, and a press released outside the island replays
 * without its release.
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
