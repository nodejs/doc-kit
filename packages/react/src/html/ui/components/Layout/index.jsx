import CrossLink from '@node-core/ui-components/Common/BaseCrossLink';
import TableOfContents from '@node-core/ui-components/Common/TableOfContents';
import Article from '@node-core/ui-components/Containers/Article';

import Banner from '../Banner';
import styles from './index.module.css';

import { navigation } from '#theme/config';
import Footer from '#theme/Footer';
import MetaBar from '#theme/Metabar';
import NavBar from '#theme/Navigation';
import SideBar from '#theme/Sidebar';

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
  const crossLinkItems = navigation.showCrossLinks
    ? (navigation.sidebar?.flatMap(({ items }) => items) ?? [])
    : [];

  const currentItem = crossLinkItems.findIndex(
    ({ link }) => link === metadata.path
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
