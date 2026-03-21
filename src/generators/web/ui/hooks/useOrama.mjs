import { create, search, load } from '@orama/orama';
import { useState, useEffect } from 'react';

/**
 * Hook for initializing and managing Orama search database
 */
export default () => {
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
    fetch('orama-db.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch orama-db.json: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          throw new Error('orama-db.json returned empty or null data');
        }
        load(db, data);
      })
      .catch(error => {
        console.error('Error loading Orama search database:', error);
      });
  }, []);

  return client;
};
