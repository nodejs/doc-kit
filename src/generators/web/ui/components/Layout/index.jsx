import TableOfContents from '@node-core/ui-components/Common/TableOfContents';
import Article from '@node-core/ui-components/Containers/Article';

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
 * @param {{ sideBarProps: object, metaBarProps: object, children: import('preact').ComponentChildren }} props
 */
export default ({ sideBarProps, metaBarProps, children }) => (
  <>
    <NavBar />
    <Article>
      <SideBar {...sideBarProps} />
      <div>
        <div>
          <TableOfContents
            headings={metaBarProps.headings}
            summaryTitle="On this page"
          />
          <br />
          <main>{children}</main>
        </div>
        <MetaBar {...metaBarProps} />
      </div>
    </Article>
    <Footer />
  </>
);
