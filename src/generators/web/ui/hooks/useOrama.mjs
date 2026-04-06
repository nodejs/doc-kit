import { create, search, load } from '@orama/orama';
import { useState, useEffect } from 'react';

import { relativeOrAbsolute } from '../utils/relativeOrAbsolute.mjs';

/**
 * Hook for initializing and managing Orama search database
 *
 * @param {string} pathname - The current page's path (e.g., '/api/fs')
 */
export default pathname => {
  const [client, setClient] = useState(null);

  useEffect(() => {
    // Create the database instance
    const db = create({
      schema: {},
    });

    // TODO(@avivkeller): Ask Orama to support this functionality natively
    /**
     * @param {any} options
     */
    db.search = options => search(db, options);

    setClient(db);

    // Load the search data
    fetch(relativeOrAbsolute('/orama-db.json', pathname))
      .then(response => response.ok && response.json())
      .then(data => load(db, data));
  }, []);

  return client;
};
