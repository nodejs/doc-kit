import DocLayout from '@doc-kit/generator-react/html/ui/components/Layout/index.jsx';

import Footer from '#theme/Footer';
import NavBar from '#theme/Navigation';

import { Kitten } from './components/Brand.jsx';

/**
 * A marketing page (`layout: home` in its frontmatter): the content spans the
 * whole width, between the navigation bar and the footer.
 *
 * @param {{ metadata: object, children: import('preact').ComponentChildren }} props
 */
const HomeLayout = ({ metadata, children }) => (
  <div class="dk-shell dk-shell--home">
    <NavBar metadata={metadata} />
    <main class="dk-home">{children}</main>
    <Footer />
  </div>
);

/**
 * The page shown for URLs without a page.
 *
 * @param {{ metadata: object }} props
 */
const NotFoundLayout = ({ metadata }) => (
  <div class="dk-shell">
    <NavBar metadata={metadata} />
    <main class="dk-not-found">
      <Kitten id="dk-kitten-404" variant="sleep" class="dk-not-found__kitten" />
      <p class="dk-eyebrow">404 · Page not found</p>
      <h1>Kit curled up on this page and fell asleep.</h1>
      <p class="dk-not-found__lead">
        The page you were looking for isn't here. It may have moved when the
        docs were reorganized, or never existed at all.
      </p>
      <div class="dk-actions dk-actions--center">
        <a class="dk-button dk-button--primary" href="/">
          Take me home
        </a>
        <a class="dk-button" href="/getting-started">
          Getting started
        </a>
      </div>
    </main>
    <Footer />
  </div>
);

const LAYOUTS = { home: HomeLayout };

/**
 * Every page is wrapped in this layout: the 404 page's, the one its
 * frontmatter selects, or doc-kit's documentation layout.
 *
 * @param {{ metadata: object, headings: Array, readingTime?: string, children: import('preact').ComponentChildren }} props
 */
export default props => {
  if (props.metadata.api === '404') {
    return <NotFoundLayout {...props} />;
  }

  const Layout = LAYOUTS[props.metadata.layout];

  return Layout ? (
    <Layout {...props} />
  ) : (
    <div class="dk-shell dk-shell--doc">
      <DocLayout {...props} />
    </div>
  );
};
