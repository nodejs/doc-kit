import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { toChildArray } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { onTablistKeyDown } from './tabs.mjs';

// How long each pane stays up while the tabs play on their own
const INTERVAL = 4800;

/**
 * Tabs over code and previews. With `autoplay`, they advance on their own
 * while in view, pause under the pointer, and stop once a tab is picked or
 * focus moves into them. The panes are its children, which are
 * server-rendered and adopted as they are.
 *
 * @param {{ tabs: Array<{ label: string, file: string }>, label: string, autoplay?: boolean, variant?: string, children: import('preact').ComponentChildren }} props
 */
const OutputTabs = ({ tabs, label, autoplay = true, variant, children }) => {
  const panes = toChildArray(children);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const root = useRef(null);
  // From the label, as no two sets of tabs on a page share one
  const id = `dk-tabs-${label.toLowerCase().replace(/\W+/g, '-')}`;

  useEffect(() => {
    if (!playing) {
      return undefined;
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // oxlint-disable-next-line react-x/set-state-in-effect -- the media query is only readable once hydrated
      setPlaying(false);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting)
    );

    observer.observe(root.current);

    return () => observer.disconnect();
  }, [playing]);

  // The timer and the progress bar start together, and restart on every pane
  const running = playing && visible && !paused;

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    const timer = setTimeout(
      () => setActive(index => (index + 1) % tabs.length),
      INTERVAL
    );

    return () => clearTimeout(timer);
  }, [running, active, tabs.length]);

  const select = index => {
    setActive(index);
    setPlaying(false);
  };

  return (
    <div
      class={variant ? `dk-tabs dk-tabs--${variant}` : 'dk-tabs'}
      ref={root}
      onFocusIn={() => setPlaying(false)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div
        class="dk-tabs__list"
        role="tablist"
        aria-label={label}
        onKeyDown={event => onTablistKeyDown(event, select)}
      >
        {tabs.map(({ label: name, file }, index) => (
          <button
            key={name}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            class="dk-tabs__tab"
            aria-selected={index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
          >
            <span>{name}</span>
            <code>{file}</code>
            {index === active && running && (
              <span
                class="dk-tabs__progress"
                style={{ animationDuration: `${INTERVAL}ms` }}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>
      {panes.map((pane, index) => (
        <div
          key={tabs[index].label}
          id={`${id}-panel-${index}`}
          class="dk-tabs__pane"
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
          hidden={index !== active}
        >
          {pane}
        </div>
      ))}
    </div>
  );
};

export default withIsland(OutputTabs, {
  name: 'OutputTabs',
  on: { idle: true },
});
