import { join } from 'node:path';

export default {
  html: {
    // The announcement banner under test is opt-in: point it at the URL the
    // spec intercepts (no real request is made).
    remoteConfigUrl: 'https://nodejs.org/site.json',

    // An island hydrating on its first click, for the press replay spec
    imports: {
      '#theme/Footer': join(
        import.meta.dirname,
        '../packages/react/src/html/ui/islands/__tests__/fixtures/PressButton.jsx'
      ),
    },
    components: {
      PressButton: '#theme/Footer',
    },
  },
};
