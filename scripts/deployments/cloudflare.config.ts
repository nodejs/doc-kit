// Cloudflare CLI (`cf`) project configuration.
//
// One Worker definition serves both deployments; `--mode` selects which:
//   cf deploy --mode=site   → doc-kit.nodejs.org     (assets from ../../www/out, built by site/main.sh)
//   cf deploy --mode=beta   → beta.docs.nodejs.org   (assets from ../../out,     built by beta/main.sh)
//
// This lives in its own workspace package because `cf` refuses to run at a
// workspace root and only sees dependencies declared by the package it runs in.
// The static-assets directory is set in ./wrangler.config.ts because `cf`
// delegates asset-only builds to Wrangler.
import { defineConfig } from 'cf/config';

export default defineConfig(({ mode }) => ({
  worker: {
    name: 'doc-kit',
    compatibilityDate: '2026-08-11',
    observability: { enabled: true },
    assets: {
      htmlHandling: 'auto-trailing-slash',
      notFoundHandling: '404-page',
    },
    domains: [mode === 'beta' ? 'beta.docs.nodejs.org' : 'doc-kit.nodejs.org'],
  },
}));
