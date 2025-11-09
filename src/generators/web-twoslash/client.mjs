/* global document */

import createHighlighter from '@node-core/rehype-shiki';
import { createTransformerFactory, rendererRich } from '@shikijs/twoslash';
import shikiNordTheme from 'shiki/themes/nord.mjs';
import { createTwoslashFromCDN } from 'twoslash-cdn';
import { createStorage } from 'unstorage';
import indexedDbDriver from 'unstorage/drivers/indexedb';

// An example using unstorage with IndexedDB to cache the virtual file system
const storage = createStorage({
  driver: indexedDbDriver({ base: 'twoslash-cdn' }),
});

const twoslash = createTwoslashFromCDN({
  storage,
  compilerOptions: {
    lib: ['dom', 'dom.iterable', 'esnext'],
    module: 'nodenext',
    types: ['node'],
  },
});

const transformerTwoslash = createTransformerFactory(twoslash.runSync)({
  renderer: rendererRich({ jsdoc: true }),
  langs: ['ts', 'js', 'cjs', 'mjs'],
  throws: false,
});

const highlighterPromise = createHighlighter({
  wasm: false,
});

/**
 * Extracts the raw code content from a <pre><code> element
 * @param {HTMLPreElement} preElement - The pre element
 * @returns {string} The raw code content
 */
function extractRawCode(preElement) {
  const codeElement = preElement.querySelector('code');
  if (!codeElement) {
    return '';
  }

  return codeElement.textContent || '';
}

/**
 * Process a single code block with Twoslash
 * @param {HTMLPreElement} preElement - The pre element
 * @returns {Promise<void>}
 */
async function processTwoslashBlock(preElement) {
  try {
    const rawCode = extractRawCode(preElement);

    if (!rawCode) {
      return;
    }

    const highlighter = await highlighterPromise;

    await twoslash.prepareTypes(rawCode);

    const html = highlighter.shiki.codeToHtml(rawCode, {
      lang: 'mjs',
      theme: {
        // We are updating this color because the background color and comment text color
        // in the Codebox component do not comply with accessibility standards.
        // See: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
        colorReplacements: { '#616e88': '#707e99' },
        ...shikiNordTheme,
      },
      transformers: [transformerTwoslash],
    });

    const temp = document.createElement('div');

    temp.innerHTML = html;

    const newPre = temp.querySelector('pre');

    if (newPre) {
      newPre.className = `${preElement.className} twoslash`;
      newPre.style = '';

      preElement.parentNode?.replaceChild(newPre, preElement);
    }
  } catch (error) {
    console.error('Error processing Twoslash block:', error);
  }
}

/**
 * Initialize Twoslash processing on page load
 */
async function initTwoslash() {
  const codeBlocks = document.querySelectorAll('pre');

  const twoslashBlocks = Array.from(codeBlocks).filter(preElement =>
    preElement.querySelector('code')
  );

  await Promise.all(twoslashBlocks.map(block => processTwoslashBlock(block)));
}

initTwoslash();
