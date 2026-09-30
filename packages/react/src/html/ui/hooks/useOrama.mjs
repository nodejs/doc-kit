import { create, search, load } from '@orama/orama';
import { useState, useEffect } from 'react';

import { relativeOrAbsolute } from '../utils/relativeOrAbsolute.mjs';

/**
 * Search clients by the URL of their data, so that the index is downloaded and
 * loaded once per visit rather than once per page navigated to.
 *
 * @type {Map<string, import('@orama/orama').AnyOrama>}
 */
const clients = new Map();

/**
 * Creates a search client whose data is fetched on its first search.
 *
 * @param {string} url - The search data's absolute URL: the client outlives
 * the page it was created on, which a relative URL would resolve against.
 */
const createClient = url => {
  const db = create({
    schema: {},
  });

  let loaded;

  // TODO(@avivkeller): Ask Orama to support this functionality natively
  /**
   * @param {any} options
   */
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

  return db;
};

/**
 * Hook for initializing and managing Orama search database.
 * The search data is lazily fetched on the first search call.
 *
 * @param {string} pathname - The current page's path (e.g., '/api/fs')
 */
export default pathname => {
  const [client, setClient] = useState(null);

  useEffect(() => {
    const url = new URL(
      relativeOrAbsolute('/orama-db.json', pathname),
      location.href
    ).href;

    if (!clients.has(url)) {
      clients.set(url, createClient(url));
    }

    queueMicrotask(() => setClient(clients.get(url)));
  }, [pathname]);

  return client;
};
