import CrossLink from '@node-core/ui-components/Common/BaseCrossLink';
import TableOfContents from '@node-core/ui-components/Common/TableOfContents';
import Article from '@node-core/ui-components/Containers/Article';

import Banner from '../Banner';
import styles from './index.module.css';
import { relativeOrAbsolute } from '../../utils/relativeOrAbsolute.mjs';

import { navigation, chunks } from '#theme/config';
import Footer from '#theme/Footer';
import MetaBar from '#theme/Metabar';
import NavBar from '#theme/Navigation';
import SideBar from '#theme/Sidebar';

/**
 * Flattens a section tree into document order.
 *
 * @param {Array<{ label: string, path: string, items?: Array }>} sections
 * @returns {Array<{ label: string, path: string }>}
 */
const flatten = sections =>
  sections.flatMap(({ items = [], ...section }) => [
    section,
    ...flatten(items),
  ]);

/**
 * Builds the ordered list of pages the previous/next links step through.
 *
 * A module that was split into chunks (and each of its chunk pages) steps
 * through the module itself followed by its sections, in document order.
 * Otherwise the configured sidebar order is used, when cross links are on.
 *
 * @param {import('../../types').SerializedMetadata} metadata
 * @returns {Array<{ label: string, link: string, path: string }>}
 */
const getCrossLinkItems = metadata => {
  const modulePath = metadata.chunk?.path ?? metadata.path;
  const group = chunks[modulePath];

  if (group) {
    const toLink = path => `${relativeOrAbsolute(path, metadata.path)}.html`;

    return [
      { label: group.label, path: modulePath },
      ...flatten(group.items),
    ].map(({ label, path }) => ({ label, link: toLink(path), path }));
  }

  if (!navigation.showCrossLinks) {
    return [];
  }

  return (navigation.sidebar?.flatMap(({ items }) => items) ?? []).map(
    item => ({ ...item, path: item.link })
  );
};

/**
 * Default page Layout component.
 *
 * Renders the full page structure: navigation, sidebar, table of contents,
 * main content, meta bar, and footer. Override via `#theme/Layout` in your
 * configuration's `imports` to customize the entire page structure.
 *
 * @param {{ metadata: import('../../types').SerializedMetadata, headings: Array, readingTime?: string, children: import('preact').ComponentChildren }} props
 */
export default ({ metadata, headings, readingTime, children }) => {
  const crossLinkItems = getCrossLinkItems(metadata);

  const currentItem = crossLinkItems.findIndex(
    ({ path }) => path === metadata.path
  );

  const [previousCrossLink, nextCrossLink] = [
    crossLinkItems[currentItem - 1],
    crossLinkItems[currentItem + 1],
  ];

  return (
    <>
      <Banner />
      <NavBar metadata={metadata} />
      <Article>
        <SideBar metadata={metadata} />
        <div>
          <div>
            <TableOfContents headings={headings} summaryTitle="On this page" />
            <br />
            <main>{children}</main>
            {(previousCrossLink || nextCrossLink) && (
              <div className={styles.crossLinks}>
                {(previousCrossLink && (
                  <CrossLink
                    type="previous"
                    label="Previous"
                    text={previousCrossLink.label}
                    link={previousCrossLink.link}
                  />
                )) || <div />}

                {nextCrossLink && (
                  <CrossLink
                    type="next"
                    label="Next"
                    text={nextCrossLink.label}
                    link={nextCrossLink.link}
                  />
                )}
              </div>
            )}
          </div>
          <MetaBar
            metadata={metadata}
            headings={headings}
            readingTime={readingTime}
          />
        </div>
      </Article>
      <Footer />
    </>
  );
};
