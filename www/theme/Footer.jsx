import { navigation, repository } from '#theme/config';
import { version } from '#theme/site';

import { Wordmark } from './components/Brand.jsx';

const group = name =>
  navigation.sidebar.find(({ groupName }) => groupName === name).items;

// The sidebar's guides and reference, then where to find the project
const COLUMNS = [
  { title: 'Learn', links: [...group('Introduction'), ...group('Guides')] },
  { title: 'Reference', links: group('Reference') },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', link: `https://github.com/${repository}` },
      { label: 'Issues', link: `https://github.com/${repository}/issues` },
      { label: '#nodejs-doc-kit on Slack', link: 'http://slack.openjsf.org/' },
      {
        label: 'Contributing',
        link: `https://github.com/${repository}/blob/main/CONTRIBUTING.md`,
      },
    ],
  },
];

/**
 * The site footer, under every page.
 */
export default () => (
  <footer class="dk-footer">
    <div class="dk-footer__inner">
      <div class="dk-footer__brand">
        <a href="/" aria-label="doc-kit home">
          <Wordmark class="dk-footer__logo" />
        </a>
        <p>
          The documentation toolkit behind the Node.js API reference. An open
          source project of the Node.js organization.
        </p>
        <p class="dk-footer__version">
          <code>@doc-kit/core@{version}</code>
        </p>
      </div>

      {COLUMNS.map(({ title, links }) => (
        <nav class="dk-footer__column" aria-label={title} key={title}>
          <p class="dk-footer__title">{title}</p>
          <ul>
            {links.map(({ label, link }) => (
              <li key={link}>
                <a href={link}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div class="dk-footer__legal">
      <p>
        Released under the{' '}
        <a href={`https://github.com/${repository}/blob/main/LICENSE`}>
          MIT License
        </a>
        . Copyright Node.js Website WG contributors.
      </p>
      <p>Built with doc-kit, of course.</p>
    </div>
  </footer>
);
