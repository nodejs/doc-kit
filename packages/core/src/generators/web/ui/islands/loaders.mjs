/* eslint-disable jsdoc/require-jsdoc -- each entry is a bare dynamic import */

/**
 * @type {Record<string, () => Promise<{ default: import('preact').ComponentType }>>}
 */
export default {
  Banner: () => import('../components/Banner'),
  ThemeToggle: () => import('../components/ThemeToggle.jsx'),
  SearchBox: () => import('../components/SearchBox'),
  SideBar: () => import('#theme/Sidebar'),
};
