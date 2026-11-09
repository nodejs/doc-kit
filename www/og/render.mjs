// Renders `og.html` into `www/public/og.png`, the site's social preview
// image. Run it after changing the card: `node --run og` from `www/`.
//
// It uses Playwright's Chromium (`npx playwright install chromium`); set
// CHROME_PATH to use another Chrome instead.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { chromium } from '@playwright/test';

const WWW = join(import.meta.dirname, '..');

/**
 * A font file of a fontsource package, as a data URL, resolved from the
 * package that depends on it.
 *
 * @param {string} from The dependent package's directory
 * @param {string} name The fontsource package
 * @param {string} file The font file
 */
const font = async (from, name, file) => {
  const require = createRequire(join(from, 'package.json'));
  const root = dirname(require.resolve(`${name}/package.json`));
  const data = await readFile(join(root, 'files', file));

  return `data:font/woff2;base64,${data.toString('base64')}`;
};

// The site's own fonts: Inter from its dependencies, and IBM Plex Mono from
// the html generator's
const react = dirname(
  createRequire(join(WWW, 'package.json')).resolve(
    '@doc-kit/generator-react/package.json'
  )
);

const html = (await readFile(join(import.meta.dirname, 'og.html'), 'utf-8'))
  .replace(
    '%INTER%',
    await font(
      WWW,
      '@fontsource-variable/inter',
      'inter-latin-wght-normal.woff2'
    )
  )
  .replace(
    '%PLEX_MONO%',
    await font(
      react,
      '@fontsource/ibm-plex-mono',
      'ibm-plex-mono-latin-400-normal.woff2'
    )
  );

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
});

const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate('document.fonts.ready');
await page.screenshot({ path: join(WWW, 'public', 'og.png') });

await browser.close();
