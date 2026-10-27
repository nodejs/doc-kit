// A small highlighter for the snippets of the home page. They are rendered on
// the server only, so none of this reaches the browser.

const escape = text =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * Wraps the matches of each rule in a token span, leaving the rest as text.
 * Rules are tried in order at each position; the first match wins.
 *
 * @param {string} code
 * @param {Array<[string, RegExp]>} rules - Token names and sticky patterns
 */
const tokenize = (code, rules) => {
  let html = '';
  let text = '';
  let index = 0;

  outer: while (index < code.length) {
    for (const [name, pattern] of rules) {
      pattern.lastIndex = index;
      const match = pattern.exec(code);

      if (match && match[0].length) {
        html += escape(text);
        text = '';
        html += name
          ? `<span class="tk-${name}">${escape(match[0])}</span>`
          : escape(match[0]);
        index += match[0].length;
        continue outer;
      }
    }

    text += code[index++];
  }

  return html + escape(text);
};

const JS = [
  ['comment', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
  ['string', /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/y],
  [
    'keyword',
    /\b(?:import|from|export|default|const|let|async|await|return|function|for|of|if|else|new|true|false|null)\b/y,
  ],
  ['number', /\b\d[\d_.]*\b/y],
  ['function', /\b[A-Za-z_$][\w$]*(?=\s*\()/y],
  ['property', /\b[A-Za-z_$][\w$-]*(?=\??\s*:)/y],
  [null, /[A-Za-z_$][\w$]*/y],
];

const JSON_RULES = [
  ['property', /"(?:\\.|[^"\\])*"(?=\s*:)/y],
  ['string', /"(?:\\.|[^"\\])*"/y],
  ['number', /-?\b\d[\d.]*\b/y],
  ['keyword', /\b(?:true|false|null)\b/y],
  ['comment', /…/y],
];

const SHELL = [
  ['comment', /#[^\n]*/y],
  ['string', /'[^']*'|"[^"]*"/y],
  ['prompt', /^\$(?= )/my],
  ['flag', /(?<=\s)--?[\w-]+/y],
  ['function', /(?<=^(?:\$ )?)(?:npx|npm|pnpm|yarn|bun|doc-kit)\b/my],
  // A token of its own, so a wrapping block can keep `orama-db` in one piece
  ['plain', /[\w./@-]+/y],
];

/**
 * Highlights Markdown in the doc-kit dialect: headings, the YAML comment
 * blocks, stability blockquotes, typed lists and code.
 *
 * @param {string} code
 */
const markdown = code =>
  tokenize(code, [
    ['comment', /<!--[\s\S]*?-->/y],
    ['heading', /^#{1,6} [^\n]*/my],
    ['quote', /^> [^\n]*/my],
    ['fence', /^```[^\n]*/my],
    ['type', /\{[^}\n]+\}/y],
    ['code', /`[^`\n]+`/y],
    ['strong', /\*\*[^*\n]+\*\*/y],
    ['bullet', /^\s*- /my],
    [null, /[^\n<#>`{*-]+/y],
  ]);

const LANGUAGES = {
  js: code => tokenize(code, JS),
  json: code => tokenize(code, JSON_RULES),
  sh: code => tokenize(code, SHELL),
  md: markdown,
};

/**
 * Highlights a snippet, returning HTML.
 *
 * @param {string} code
 * @param {'js' | 'json' | 'sh' | 'md'} language
 */
export const highlight = (code, language) =>
  (LANGUAGES[language] ?? escape)(code.replace(/^\n|\n\s*$/g, ''));
