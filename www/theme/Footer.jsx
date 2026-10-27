import { repository } from '#theme/config';
import { version } from '#theme/site';

import { Wordmark } from './components/Brand.jsx';

const COLUMNS = [
  {
    title: 'Learn',
    links: [
      { label: 'Why doc-kit', href: '/introduction' },
      { label: 'Getting started', href: '/getting-started' },
      { label: 'Writing documentation', href: '/writing-docs' },
      { label: 'Documenting TypeScript', href: '/typescript' },
      { label: 'Customizing the site', href: '/customization' },
      { label: 'Publishing your docs', href: '/publishing' },
      { label: 'Creating generators', href: '/creating-generators' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'CLI', href: '/cli' },
      { label: 'Configuration', href: '/configuration' },
      { label: 'Generators', href: '/generators' },
      { label: 'Specification', href: '/specification' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub', href: `https://github.com/${repository}` },
      { label: 'Issues', href: `https://github.com/${repository}/issues` },
      {
        label: '#nodejs-website on Slack',
        href: 'https://openjs-foundation.slack.com/archives/CVAMEJ4UV',
      },
      {
        label: 'Contributing',
        href: `https://github.com/${repository}/blob/main/CONTRIBUTING.md`,
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
            {links.map(({ label, href }) => (
              <li key={href}>
                <a href={href}>{label}</a>
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
