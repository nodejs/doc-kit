// Build settings for the Wrangler bundler that `cf` delegates to.
// See ./cloudflare.config.ts for the Worker definition and the mode switch.
import { defineWranglerConfig } from 'wrangler/experimental-config';

export default defineWranglerConfig(({ mode }) => ({
  types: { generate: false },
  assetsDirectory: mode === 'beta' ? '../../out' : '../../www/out',
}));
