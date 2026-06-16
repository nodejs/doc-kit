import { create, search, load } from '@orama/orama';
import { useState, useEffect, useRef } from 'react';

import { relativeOrAbsolute } from '../utils/relativeOrAbsolute.mjs';

/**
 * Hook for initializing and managing Orama search database.
 * The search data is lazily fetched on the first search call.
 *
 * @param {string} pathname - The current page's path (e.g., '/api/fs')
 */
export default pathname => {
  const [client, setClient] = useState(null);
  const loaded = useRef(null);

  useEffect(() => {
    // Create the database instance
    const db = create({
      schema: {},
    });

    /**
     * Ensures the search data is loaded.
     * @returns {Promise<void>} A promise that resolves when the data is loaded.
     */
    const ensureLoaded = () => {
      if (!loaded.current) {
        loaded.current = fetch(relativeOrAbsolute('/orama-db.json', pathname))
          .then(response => response.ok && response.json())
          .then(data => load(db, data))
          .catch(() => {
            loaded.current = null;
          });
      }

      return loaded.current;
    };

    // TODO(@avivkeller): Ask Orama to support this functionality natively
    /**
     * @param {any} options
     */
    db.search = async options => {
      await ensureLoaded();
      return search(db, options);
    };

    setClient(db);
  }, []);

  return client;
};
