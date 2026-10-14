export default {
  extends: '@node-core/doc-kit/config',

  html: {
    remoteConfigUrl:
      'https://raw.githubusercontent.com/nodejs/doc-kit/main/beta/site.json',

    navigation: {
      // This preview is deployed at a subdomain, so
      // these links need to be absolute
      navbar: [
        { text: 'Learn', link: 'https://nodejs.org/en/learn' },
        { text: 'About', link: 'https://nodejs.org/en/about' },
        { text: 'Download', link: 'https://nodejs.org/en/download' },
        { text: 'Docs', link: 'https://nodejs.org/docs/latest/api/' },
        { text: 'Blog', link: 'https://nodejs.org/en/blog/' },
        {
          text: 'Contribute',
          link: 'https://github.com/nodejs/node/blob/main/CONTRIBUTING.md',
          target: '_blank',
        },
      ],
    },
  },
};
