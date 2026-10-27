import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PRESS_EVENTS } from '../../constants.mjs';
import { holdPresses } from '../presses.mjs';

/**
 * A press event, with what a replay copies from it.
 */
class Press {
  defaultPrevented = false;

  /**
   * @param {string} type
   * @param {{ target?: object, clientX?: number }} init
   */
  constructor(type, { target, clientX } = {}) {
    this.type = type;
    this.target = target;
    this.clientX = clientX;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

/**
 * An element that records the events dispatched to it, inside `island`.
 */
const createElement = island => ({
  isConnected: true,
  dispatched: [],
  closest: () => island,
  dispatchEvent(event) {
    this.dispatched.push(event);
  },
});

/**
 * An island whose readiness the test controls, and whose listeners it calls
 * the way a press bubbling up to it would.
 */
const createIsland = () => {
  const listeners = new Map();
  let ready;

  const island = {
    ready: new Promise(resolve => (ready = resolve)),
    setReady: () => ready(),
    wait: () => island.ready,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    press: event => listeners.get(event.type)?.(event),
    listening: () => [...listeners.keys()],
  };

  return island;
};

describe('holdPresses', () => {
  it('replays the presses once the island is ready, in order', async () => {
    const island = createIsland();
    const button = createElement(island);
    const release = holdPresses(island);

    for (const type of PRESS_EVENTS) {
      island.press(new Press(type, { target: button, clientX: 12 }));
    }

    release();
    await Promise.resolve();
    assert.deepEqual(button.dispatched, []);

    island.setReady();
    await island.ready;

    assert.deepEqual(
      button.dispatched.map(({ type }) => type),
      PRESS_EVENTS
    );
    assert.ok(button.dispatched.every(event => event instanceof Press));
    assert.ok(button.dispatched.every(({ clientX }) => clientX === 12));
  });

  it('replays a touch cancelled to scroll with its cancel', async () => {
    const island = createIsland();
    const button = createElement(island);
    const release = holdPresses(island);

    island.press(new Press('pointerdown', { target: button }));
    island.press(new Press('pointercancel', { target: button }));
    island.setReady();
    release();
    await island.ready;

    assert.deepEqual(
      button.dispatched.map(({ type }) => type),
      ['pointerdown', 'pointercancel']
    );
  });

  it("holds back a click's default action for its replay", () => {
    const island = createIsland();
    const click = new Press('click', { target: createElement(island) });
    const mousedown = new Press('mousedown', {
      target: createElement(island),
    });

    holdPresses(island);
    island.press(click);
    island.press(mousedown);

    assert.equal(click.defaultPrevented, true);
    // Pressing still focuses and starts selecting text
    assert.equal(mousedown.defaultPrevented, false);
  });

  it('stops holding presses once released', async () => {
    const island = createIsland();
    const button = createElement(island);
    const release = holdPresses(island);

    release();
    assert.deepEqual(island.listening(), []);

    island.press(new Press('click', { target: button }));
    island.setReady();
    await island.ready;

    assert.deepEqual(button.dispatched, []);
  });

  it('waits for the nested island a press landed in', async () => {
    const outer = createIsland();
    const inner = createIsland();
    const button = createElement(inner);
    const release = holdPresses(outer);

    outer.press(new Press('click', { target: button }));
    outer.setReady();
    release();
    await outer.ready;
    assert.deepEqual(button.dispatched, []);

    inner.setReady();
    await inner.ready;
    assert.deepEqual(
      button.dispatched.map(({ type }) => type),
      ['click']
    );
  });

  it('drops presses on elements removed from the page', async () => {
    const island = createIsland();
    const link = createElement(island);
    const release = holdPresses(island);

    island.press(new Press('click', { target: link }));
    link.isConnected = false;
    island.setReady();
    release();
    await island.ready;
    await Promise.resolve();

    assert.deepEqual(link.dispatched, []);
  });
});
