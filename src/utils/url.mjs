/**
 * Kind of like `path.posix.relative`, however, this functions more like a URL resolution
 * @param {string} to
 * @param {string} from
 * @returns {string}
 */
export const relative = (to, from) => {
  if (to.includes('://')) {
    return to;
  }

  const a = to.split('/').filter(Boolean);
  const b = from.split('/').slice(0, -1).filter(Boolean);

  while (a[0] !== undefined && a[0] === b[0]) {
    a.shift();
    b.shift();
  }

  const rel = [...b.map(() => '..'), ...a].join('/');
  return rel || '.';
};
