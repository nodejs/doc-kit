import { useState } from 'preact/hooks';

import withIsland from '../../withIsland.jsx';

/**
 * For `e2e/press-replay.spec.js`: a button that only hydrates once it's
 * clicked, so its first click is the one that starts it loading.
 */
const PressButton = () => {
  const [presses, setPresses] = useState(0);

  return (
    <button type="button" onClick={() => setPresses(presses + 1)}>
      Presses: {presses}
    </button>
  );
};

export default withIsland(PressButton, {
  name: 'PressButton',
  on: { interaction: true },
});
