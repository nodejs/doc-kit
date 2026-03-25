import TableOfContents from '@node-core/ui-components/Common/TableOfContents';
import Article from '@node-core/ui-components/Containers/Article';

import { RemoteLoadableBanner } from '../AnnouncementBanner';

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
 * @param {{
 *  metadata: import('../../types').SerializedMetadata,
 *  headings: Array,
 *  readingTime: string,
 *  children: import('preact').ComponentChildren,
 *  announcementBannerProps: object
 * }} props
 */
export default ({
  metadata,
  headings,
  readingTime,
  announcementBannerProps,
  children,
}) => (
  <>
    <RemoteLoadableBanner {...announcementBannerProps} />
    <NavBar metadata={metadata} />
    <Article>
      <SideBar metadata={metadata} />
      <div>
        <div>
          <TableOfContents headings={headings} summaryTitle="On this page" />
          <br />
          <main>{children}</main>
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
