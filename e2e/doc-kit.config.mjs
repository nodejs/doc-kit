export default {
  html: {
    // The announcement banner under test is opt-in: point it at the URL the
    // spec intercepts (no real request is made).
    remoteConfigUrl: 'https://nodejs.org/site.json',
  },
};
