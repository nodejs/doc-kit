import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import CopyButton from './CopyButton.jsx';
import { onTablistKeyDown } from './tabs.mjs';

const PACKAGES = '@doc-kit/cli @doc-kit/generator-react';

const COMMANDS = {
  npm: `npm i -D ${PACKAGES}`,
  pnpm: `pnpm add -D ${PACKAGES}`,
  yarn: `yarn add -D ${PACKAGES}`,
  bun: `bun add -d ${PACKAGES}`,
};

// Remembered across pages and visits, so every install box agrees
const STORAGE_KEY = 'doc-kit:package-manager';

// Sent on a pick, so the other boxes on the page follow it
const CHANGE_EVENT = 'doc-kit:package-manager';

const MANAGERS = Object.keys(COMMANDS);

/**
 * Reads the remembered package manager, if storage is available.
 */
const remembered = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return MANAGERS.includes(value) ? value : null;
  } catch {
    return null;
  }
};

/**
 * The install command, with a tab per package manager and a copy button.
 *
 * @param {{ id?: string }} props - `id` prefixes the ids of the tabs and their
 *   panel, so it's unique per box
 */
const InstallTabs = ({ id = 'dk-install' }) => {
  const [manager, setManager] = useState('npm');

  // After hydration, so the server-rendered markup (npm) matches first
  useEffect(() => {
    const value = remembered();

    if (value) {
      // oxlint-disable-next-line react-x/set-state-in-effect -- storage is only readable once hydrated
      setManager(value);
    }

    const follow = event => setManager(event.detail);

    addEventListener(CHANGE_EVENT, follow);

    return () => removeEventListener(CHANGE_EVENT, follow);
  }, []);

  const select = value => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode, or storage disabled: the choice lasts for the page
    }

    // Every box on the page follows it, this one included
    dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
  };

  return (
    <div class="dk-install">
      <div
        class="dk-install__tabs"
        role="tablist"
        aria-label="Package manager"
        onKeyDown={event =>
          onTablistKeyDown(event, index => select(MANAGERS[index]))
        }
      >
        {MANAGERS.map(value => (
          <button
            key={value}
            id={`${id}-${value}`}
            type="button"
            role="tab"
            aria-selected={value === manager}
            aria-controls={`${id}-command`}
            tabIndex={value === manager ? 0 : -1}
            class="dk-install__tab"
            onClick={() => select(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        id={`${id}-command`}
        class="dk-install__command"
        role="tabpanel"
        aria-labelledby={`${id}-${manager}`}
      >
        <code>
          <span class="dk-install__prompt" aria-hidden="true">
            $
          </span>{' '}
          {/* Each word in one piece, so a narrow box wraps between them */}
          {COMMANDS[manager].split(' ').map((word, index) => (
            // oxlint-disable-next-line react-x/no-array-index-key -- a command's words never reorder
            <Fragment key={index}>
              {index > 0 && ' '}
              <span>{word}</span>
            </Fragment>
          ))}
        </code>
        <CopyButton key={manager} text={COMMANDS[manager]} />
      </div>
    </div>
  );
};

export default withIsland(InstallTabs, {
  name: 'InstallTabs',
  on: { idle: true },
});
