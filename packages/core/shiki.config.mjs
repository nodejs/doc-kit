'use strict';

import cLanguage from 'shiki/langs/c.mjs';
import coffeeScriptLanguage from 'shiki/langs/coffeescript.mjs';
import cPlusPlusLanguage from 'shiki/langs/cpp.mjs';
import diffLanguage from 'shiki/langs/diff.mjs';
import dockerLanguage from 'shiki/langs/docker.mjs';
import httpLanguage from 'shiki/langs/http.mjs';
import javaScriptLanguage from 'shiki/langs/javascript.mjs';
import jsonLanguage from 'shiki/langs/json.mjs';
import powershellLanguage from 'shiki/langs/powershell.mjs';
import shellScriptLanguage from 'shiki/langs/shellscript.mjs';
import shellSessionLanguage from 'shiki/langs/shellsession.mjs';
import typeScriptLanguage from 'shiki/langs/typescript.mjs';
import lightTheme from 'shiki/themes/catppuccin-latte.mjs';
import darkTheme from 'shiki/themes/catppuccin-mocha.mjs';

/**
 * Creates a Shiki configuration for the API Docs tooling
 *
 * @type {import('@shikijs/core').HighlighterCoreOptions}
 */
export default {
  // Only register the themes we need, to support light/dark theme
  themes: [lightTheme, darkTheme],
  // Only register the languages that the API docs use
  // and override the JavaScript language with the aliases
  langs: [
    ...httpLanguage,
    ...jsonLanguage,
    ...typeScriptLanguage,
    ...shellScriptLanguage,
    ...powershellLanguage,
    ...shellSessionLanguage,
    ...dockerLanguage,
    ...diffLanguage,
    ...cLanguage,
    ...cPlusPlusLanguage,
    ...coffeeScriptLanguage,
    { ...javaScriptLanguage[0], aliases: ['mjs', 'cjs', 'js'] },
  ],
};
