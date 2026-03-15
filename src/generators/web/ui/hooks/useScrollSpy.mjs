import { useState, useEffect } from 'react';

/**
 * Determines the active heading slug from IntersectionObserver entries.
 * Exported as a named function to allow unit testing without a DOM environment.
 *
 * @param {IntersectionObserverEntry[]} entries
 * @returns {string | null}
 */
export const getActiveSlug = entries => {
  const visible = entries.find(e => e.isIntersecting);

  return visible ? visible.target.id : null;
};

/**
 * Tracks which heading is currently visible in the viewport using IntersectionObserver.
 *
 * @param {Array<{ slug: string }>} headings
 * @returns {string | null} The slug of the active heading
 */
export const useScrollSpy = headings => {
  const [activeSlug, setActiveSlug] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const slug = getActiveSlug(entries);

        if (slug !== null) {
          setActiveSlug(slug);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach(({ slug }) => {
      const el = document.getElementById(slug);

      if (el) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  return activeSlug;
};
