// Miniatures of what doc-kit makes of the page in the home page's sources:
// its section on the site, and its result in the search box.

/**
 * `kittens.adopt` as the site renders it.
 */
export const SitePreview = () => (
  <div class="dk-mock">
    <div class="dk-mock__heading">
      <span class="dk-mock__kind" title="Method">
        M
      </span>
      <p>kittens.adopt</p>
      <span class="dk-mock__history">Added in v1.0.0</span>
    </div>
    <p class="dk-mock__signature">
      kittens.<span class="tk-function">adopt</span>(name, options
      <span class="tk-comment">?</span>): <span class="tk-type">Promise</span>
    </p>
    <p class="dk-mock__stability">
      <span>Stability: 1</span> Experimental
    </p>
    <div class="dk-mock__params">
      <p class="dk-mock__param">
        <code>name:</code> <span class="dk-mock__type">string</span>
        <span class="dk-mock__text">The kitten's name.</span>
      </p>
      <div class="dk-mock__param">
        <code>options?:</code> <span class="dk-mock__type">Object</span>
        <div class="dk-mock__nested">
          <p>
            <code>color?:</code> <span class="dk-mock__type">string</span>
            <span class="dk-mock__text">
              Coat color. <strong>Default:</strong> <code>'tabby'</code>.
            </span>
          </p>
          <p>
            <code>signal:</code> <span class="dk-mock__type">AbortSignal</span>
            <span class="dk-mock__text">Cancels the adoption.</span>
          </p>
        </div>
      </div>
      <p class="dk-mock__param dk-mock__returns">
        <code>Returns:</code> <span class="dk-mock__type">Promise</span>
        <span class="dk-mock__text">Fulfills with the adopted kitten.</span>
      </p>
    </div>
  </div>
);

/**
 * `adopt` found in the search box, above the page's own words: what the index
 * holds for it.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const SearchPreview = ({ children }) => (
  <div class="dk-search-mock">
    <div class="dk-search-mock__box">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <span>adopt</span>
      <kbd>⌘ K</kbd>
    </div>
    <div class="dk-search-mock__result">
      <p class="dk-search-mock__section">Kittens</p>
      <p class="dk-search-mock__title">adopt</p>
      <p>Adopts a kitten, once the paperwork is done.</p>
    </div>
    {children}
  </div>
);
