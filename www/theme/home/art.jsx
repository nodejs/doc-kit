// The illustrations of the home page's feature cards, by the `art` a card
// names. They only decorate: the card's words are in the page.

export default {
  api: (
    <div class="dk-art">
      <p>
        <span class="tk-keyword">##</span>{' '}
        <span class="tk-code">`kittens.pet(kitten[, times])`</span>
      </p>
      <ul>
        <li>
          <b>kind</b> method
        </li>
        <li>
          <b>params</b> kitten, times<i>?</i>
        </li>
        <li>
          <b>added</b> v1.2.0
        </li>
        <li>
          <b>stability</b> 2 · Stable
        </li>
      </ul>
    </div>
  ),
  types: (
    <div class="dk-art dk-art--types">
      <p class="dk-art__braces">
        {'{'}
        <span>string</span>|<span>Buffer</span>|<span>URL</span>
        {'}'}
      </p>
      <ul>
        <li>
          <span>string</span> developer.mozilla.org
        </li>
        <li>
          <span>Buffer</span> your type map
        </li>
        <li>
          <span>URL</span> developer.mozilla.org
        </li>
      </ul>
    </div>
  ),
  islands: (
    <div class="dk-art dk-art--islands">
      <div class="dk-art__nav">
        <span />
        <span class="dk-art__island">search</span>
        <span class="dk-art__island">theme</span>
      </div>
      <div class="dk-art__body">
        <div class="dk-art__side dk-art__island">sidebar</div>
        <div class="dk-art__text">
          <span />
          <span />
          <span class="dk-art__island dk-art__tabs">code</span>
          <span />
          <span />
        </div>
      </div>
    </div>
  ),
  ai: (
    <div class="dk-art">
      <p>
        <span class="tk-comment">GET</span> /llms.txt
      </p>
      <p>
        <span class="tk-comment">GET</span> /llms-full.txt
      </p>
      <p>
        <span class="tk-comment">GET</span> /orama-db.json
      </p>
      <p>
        <span class="tk-comment">GET</span> /sitemap.xml
      </p>
    </div>
  ),
  theme: (
    <div class="dk-art">
      <p>
        <span class="tk-property">'#theme/Logo'</span>:{' '}
        <span class="tk-string">'./Logo.jsx'</span>,
      </p>
      <p>
        <span class="tk-property">'#theme/Layout'</span>:{' '}
        <span class="tk-string">'./Layout.jsx'</span>,
      </p>
      <p>
        <span class="tk-property">'#theme/Footer'</span>:{' '}
        <span class="tk-string">'./Footer.jsx'</span>,
      </p>
    </div>
  ),
  typescript: (
    <div class="dk-art">
      <p>
        <span class="tk-keyword">function</span>{' '}
        <span class="tk-function">adopt</span>(name:{' '}
        <span class="tk-type">string</span>)
      </p>
      <p class="dk-art__down">↓ @doc-kit/typedoc</p>
      <p>
        <span class="tk-keyword">#</span>{' '}
        <span class="tk-code">`adopt(name)`</span>
      </p>
      <p>
        - <span class="tk-code">`name`</span>{' '}
        <span class="tk-type">{'{string}'}</span>
      </p>
    </div>
  ),
};
