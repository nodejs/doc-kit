import SideBar from '@node-core/ui-components/Containers/Sidebar';

import { relativeOrAbsolute } from '../../packages/core/src/generators/web/ui/utils/relativeOrAbsolute.mjs';
import { renderLabel } from '../../packages/core/src/generators/web/ui/utils/renderLabel.jsx';

import { pages } from '#theme/config';

// `jsx-ast` sorts pages by a hardcoded list of Node.js-specific slugs and then
// alphabetically by heading text, which buries the narrative pages beneath the
// sixteen `` `x` Generator `` reference pages (a backtick sorts before letters).
// There is no configuration hook for this, so the ordering lives here instead.
//
// Pages absent from this list fall to the end of the group, alphabetically.
const GUIDE_ORDER = [
  '/index',
  '/getting-started',
  '/configuration',
  '/commands',
  '/generators',
  '/specification',
  '/comparators',
];

const isGenerator = ([, path]) => path.startsWith('/generators/');

/**
 * Orders the narrative pages by `GUIDE_ORDER`, leaving anything unlisted at the
 * end in the alphabetical order `jsx-ast` already produced.
 *
 * @param {Array<[string, string]>} guides
 * @returns {Array<[string, string]>}
 */
const orderGuides = guides =>
  guides.toSorted(([, a], [, b]) => {
    const ai = GUIDE_ORDER.indexOf(a);
    const bi = GUIDE_ORDER.indexOf(b);

    if (ai !== -1 && bi !== -1) {
      return ai - bi;
    }

    return ai !== -1 ? -1 : bi !== -1 ? 1 : 0;
  });

/**
 * Sidebar with the narrative guides split from the generator reference.
 *
 * The built-in sidebar also renders a version `<Select>`. This site publishes a
 * single version and passes an empty `changelog`, so `versions` is empty and the
 * control has nothing to offer; it is omitted.
 *
 * @param {{ metadata: import('../../packages/core/src/generators/web/ui/types').SerializedMetadata }} props
 */
export default ({ metadata }) => {
  const toItem = ([heading, path]) => ({
    label: renderLabel(heading),
    link:
      metadata.path === path
        ? `${metadata.basename}.html`
        : `${relativeOrAbsolute(path, metadata.path)}.html`,
  });

  const guides = orderGuides(pages.filter(page => !isGenerator(page)));
  const generators = pages.filter(isGenerator);

  return (
    <SideBar
      pathname={`${metadata.basename}.html`}
      groups={[
        { groupName: 'Pages', items: guides.map(toItem) },
        { groupName: 'Generators', items: generators.map(toItem) },
      ]}
      as={props => <a {...props} rel="prefetch" />}
      title="Navigation"
    />
  );
};
