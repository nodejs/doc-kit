import { create, search, load } from '@orama/orama';
import { useState, useEffect } from 'react';

import { relativeOrAbsolute } from '../utils/relativeOrAbsolute.mjs';

/**
 * The search client for this visit, shared across every page navigated to
 * client-side. The Orama index (several MB) is fetched once on the first
 * search and reused from then on.
 *
 * @type {import('@orama/orama').AnyOrama | null}
 */
let client = null;

/**
 * Returns the shared search client, creating it on the first call.
 *
 * @param {string} url - Absolute URL of the search data, resolved once at
 * creation so the client outlives the page it was first used on.
 */
const getClient = url => {
  if (client) {
    return client;
  }

  const db = create({ schema: {} });
  let loaded;

  // TODO(@avivkeller): Ask Orama to support this functionality natively
  /** @param {any} options */
  db.search = async options => {
    loaded ??= fetch(url)
      .then(response => response.ok && response.json())
      .then(data => load(db, data))
      .catch(() => {
        loaded = undefined;
      });

    await loaded;

    return search(db, options);
  };

  client = db;

  return client;
};

/**
 * Hook for initializing and managing the Orama search client.
 * The search data is lazily fetched on the first search call.
 *
 * @param {string} pathname - The current page's path (e.g., '/api/fs')
 */
export default pathname => {
  const [db, setDb] = useState(null);

  useEffect(() => {
    const url = new URL(
      relativeOrAbsolute('/orama-db.json', pathname),
      location.href
    ).href;

    queueMicrotask(() => setDb(getClient(url)));
  }, [pathname]);

  return db;
};
