import { repository } from '#theme/config';

import { Kitten } from '../components/Brand.jsx';
import CopyCode from '../components/CopyCode.jsx';
import HeroFlow from '../components/HeroFlow.jsx';
import { highlight } from '../components/highlight.mjs';
import InstallTabs from '../components/InstallTabs.jsx';
import OutputTabs from '../components/OutputTabs.jsx';
import PipelineFlow from '../components/PipelineFlow.jsx';
import {
  BENCHMARK,
  GENERATOR_COUNT,
  NODE_DOCS_REQUESTS,
  SHOWCASE,
  SITE_BENCHMARK,
} from '../data.mjs';
import * as snippets from './snippets.mjs';

const Code = ({ code, language, class: className = '' }) => (
  <pre class={`dk-code ${className}`}>
    <code dangerouslySetInnerHTML={{ __html: highlight(code, language) }} />
  </pre>
);

const Arrow = () => (
  <svg class="dk-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8h10m-4-4 4 4-4 4" />
  </svg>
);

const External = () => (
  <svg class="dk-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 11l6-6m-5 0h5v5" />
  </svg>
);

const SectionHeader = ({ eyebrow, title, children }) => (
  <header class="dk-section__header">
    <p class="dk-eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    {children && <p class="dk-lead">{children}</p>}
  </header>
);

const formatSeconds = seconds => `${seconds.toFixed(1)} s`;

const Hero = () => (
  <section class="dk-hero dk-frame">
    <div class="dk-hero__copy">
      <a class="dk-pill" href="https://beta.docs.nodejs.org/">
        <span class="dk-pill__dot" aria-hidden="true" />
        Building the next Node.js API docs
        <Arrow />
      </a>
      <h1 class="dk-hero__title">
        The docs toolkit
        <br />
        <span class="dk-hero__soft">for APIs.</span>
      </h1>
      <p class="dk-hero__lead">
        doc-kit reads your API from Markdown, MDX, TypeScript and JSDoc, and
        keeps its signatures, typed parameters, stability and history as data.
        From there it builds a fast, searchable site, JSON, LLMs.txt and
        anything else a generator can write.
      </p>
      <div class="dk-actions">
        <a class="dk-button dk-button--primary" href="/getting-started">
          Get started
          <Arrow />
        </a>
        <a class="dk-button" href="/introduction">
          Why doc-kit?
        </a>
      </div>
      <InstallTabs />
    </div>
    <div class="dk-hero__visual">
      <HeroFlow />
    </div>
  </section>
);

const Proof = () => (
  <section class="dk-proof dk-frame" aria-label="Sites built with doc-kit">
    <p class="dk-proof__title">Documenting the JavaScript ecosystem</p>
    <ul class="dk-proof__list">
      {SHOWCASE.map(({ name, url }) => (
        <li key={name}>
          <a href={url}>
            {name}
            <External />
          </a>
        </li>
      ))}
    </ul>
  </section>
);

const Stats = () => (
  <section class="dk-stats dk-frame" aria-label="doc-kit in numbers">
    <div class="dk-stat">
      <p class="dk-stat__value">
        {NODE_DOCS_REQUESTS}
        <span>+</span>
      </p>
      <p class="dk-stat__label">
        requests a month to the Node.js API docs, built with{' '}
        <span class="dk-nowrap">doc-kit</span>
      </p>
    </div>
    <div class="dk-stat">
      <p class="dk-stat__value">{GENERATOR_COUNT}</p>
      <p class="dk-stat__label">
        built-in generators, from the website to LLMs.txt. Yours is one module
      </p>
    </div>
    <div class="dk-stat">
      <p class="dk-stat__value">
        {BENCHMARK.clientKilobytes}
        <span>kB</span>
      </p>
      <p class="dk-stat__label">
        of gzipped JavaScript up front. Islands load the rest as they hydrate
      </p>
    </div>
  </section>
);

/**
 * How long a build of some docs takes, output by output, then all at once.
 *
 * @param {{ benchmark: typeof BENCHMARK }} props
 */
const Bench = ({ benchmark }) => {
  const runs = [...benchmark.runs, { ...benchmark.together, strong: true }];
  const slowest = Math.max(...runs.map(({ seconds }) => seconds));

  return (
    <div class="dk-bench">
      <p class="dk-bench__title">
        {benchmark.title}
        <span>{benchmark.subtitle}</span>
      </p>

      <ul class="dk-bench__bars">
        {runs.map(({ detail, seconds, strong }) => (
          <li
            key={detail}
            class={`dk-bench__bar${strong ? ' dk-bench__bar--strong' : ''}`}
          >
            <p>
              <span>{detail}</span>
            </p>
            <div class="dk-bench__track">
              <div
                class={`dk-bench__fill${strong ? ' dk-bench__fill--strong' : ''}`}
                style={{ width: `${(seconds / slowest) * 100}%` }}
              />
            </div>
            <p class="dk-bench__value">{formatSeconds(seconds)}</p>
          </li>
        ))}
      </ul>

      <p class="dk-caption">
        Median of {benchmark.runsEach} clean builds on an {benchmark.machine}{' '}
        and <span class="dk-nowrap">doc-kit</span>{' '}
        <code>{benchmark.commit}</code>.{' '}
        <a href="/introduction#performance">How we measured</a>
      </p>
    </div>
  );
};

const Performance = () => (
  <section class="dk-section dk-frame" id="performance">
    <SectionHeader eyebrow="Performance" title="Parse once. Build in parallel.">
      doc-kit parses your docs once and builds every output from that one parse.
      So JSON, the search index and LLMs.txt add only a little to the time the
      site takes on its own.
    </SectionHeader>

    <div class="dk-split">
      <div class="dk-panel dk-flow">
        <PipelineFlow
          pages={SITE_BENCHMARK.pages}
          documents={SITE_BENCHMARK.documents}
        />
        <ul class="dk-flow__notes">
          <li>
            <strong>Works in chunks.</strong> The heavy stages split the work
            across a pool of worker threads, and the site and JSON are written
            chunk by chunk.
          </li>
          <li>
            <strong>Runs side by side.</strong> Outputs that don't depend on
            each other run at the same time, all from the same API entries.
          </li>
          <li>
            <strong>Frees as it goes.</strong> A stage's result is dropped once
            its last reader is done, so memory is reclaimed while the rest of
            the build runs.
          </li>
        </ul>
      </div>

      <OutputTabs
        variant="bench"
        autoplay={false}
        label="Benchmarks"
        tabs={[
          {
            label: 'This site',
            file: `${SITE_BENCHMARK.pages} pages in ${formatSeconds(SITE_BENCHMARK.together.seconds)}`,
          },
          {
            label: 'Node.js API docs',
            file: `${BENCHMARK.pages} pages in ${formatSeconds(BENCHMARK.together.seconds)}`,
          },
        ]}
      >
        <Bench benchmark={SITE_BENCHMARK} />
        <Bench benchmark={BENCHMARK} />
      </OutputTabs>
    </div>
  </section>
);

const SitePreview = () => (
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

const SearchPreview = () => (
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
    <p class="dk-search-mock__note">Its entry in the search index:</p>
    <Code code={snippets.KITTENS_SEARCH} language="json" />
  </div>
);

const OneSource = () => (
  <section class="dk-section dk-frame" id="outputs">
    <SectionHeader
      eyebrow="One source, many formats"
      title="Write it once. Every output agrees."
    >
      Document an API in Markdown, where a heading is a signature, a list holds
      typed parameters and a comment records history. Use MDX for pages that
      need components, or let the TypeDoc plugin write the Markdown from your
      TypeScript and JSDoc. <span class="dk-nowrap">doc-kit</span> parses it all
      once into typed API entries and builds every output from them.
    </SectionHeader>

    <div class="dk-source">
      <OutputTabs
        autoplay={false}
        label="Sources"
        tabs={[
          { label: 'Markdown', file: 'kittens.md' },
          { label: 'TypeScript', file: 'kittens.ts' },
          { label: 'JSDoc', file: 'kittens.js' },
        ]}
      >
        <Code code={snippets.KITTENS_MD} language="md" />
        <div class="dk-typedoc">
          <Code code={snippets.KITTENS_TS} language="js" />
          <p class="dk-typedoc__note">
            <code>@doc-kit/typedoc</code> turns this into{' '}
            <span class="dk-nowrap">doc-kit</span> Markdown, with its signature,
            typed parameters and stability.
          </p>
        </div>
        <div class="dk-typedoc">
          <Code code={snippets.KITTENS_JS} language="js" />
          <p class="dk-typedoc__note">
            Plain JavaScript works too: TypeDoc reads the JSDoc types, and{' '}
            <code>@doc-kit/typedoc</code> writes the Markdown from them.
          </p>
        </div>
      </OutputTabs>

      <div class="dk-source__arrow" aria-hidden="true">
        <span />
      </div>

      <OutputTabs
        label="Outputs"
        tabs={[
          { label: 'Site', file: 'html' },
          { label: 'JSON', file: 'json' },
          { label: 'Search', file: 'orama-db' },
          { label: 'LLMs', file: 'llms-txt' },
        ]}
      >
        <SitePreview />
        <Code code={snippets.KITTENS_JSON} language="json" />
        <SearchPreview />
        <Code code={snippets.KITTENS_LLMS} language="md" />
      </OutputTabs>
    </div>
  </section>
);

const FEATURES = [
  {
    id: 'api',
    title: 'Knows a method when it sees one',
    text: 'Classes, methods, events, properties and constructors are recognized by how you write their headings. Parameters, defaults, return values, stability and history become data, not decoration.',
    href: '/writing-docs',
    art: (
      <div class="dk-art" aria-hidden="true">
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
  },
  {
    id: 'types',
    title: 'Types that link themselves',
    text: 'Write {string|Buffer} and each type links to its docs, found in your type map first, then on MDN for JavaScript built-ins and Web APIs, then in your own pages.',
    href: '/writing-docs#types-that-link-themselves',
    art: (
      <div class="dk-art dk-art--types" aria-hidden="true">
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
  },
  {
    id: 'islands',
    title: 'Static pages, interactive islands',
    text: `Pages are rendered to static HTML at build time and load ${BENCHMARK.clientKilobytes}\u00a0kB of gzipped JavaScript up front. The search box, theme switch and sidebar hydrate once the browser is idle, and code blocks the first time you reach for one. Links between pages swap the content in place.`,
    href: '/generators/html#client-side-navigation',
    art: (
      <div class="dk-art dk-art--islands" aria-hidden="true">
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
  },
  {
    id: 'ai',
    title: 'For people and for models',
    text: (
      <>
        The search index, a sitemap and LLMs.txt, in a short and a full version,
        come out of the same build as the site. People and models read the same
        docs.
      </>
    ),
    href: '/generators/llms-txt',
    art: (
      <div class="dk-art" aria-hidden="true">
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
  },
  {
    id: 'theme',
    title: 'Make it yours',
    text: (
      <>
        Swap any part of the page for your own component, use components in MDX,
        restyle it with CSS or hand Vite your plugins. This site is{' '}
        <span class="dk-nowrap">doc-kit</span>, themed.
      </>
    ),
    href: '/customization',
    art: (
      <div class="dk-art" aria-hidden="true">
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
  },
  {
    id: 'typescript',
    title: 'TypeScript and JSDoc, too',
    text: (
      <>
        The experimental <span class="dk-nowrap">@doc-kit/typedoc</span> plugin
        turns TypeScript and JSDoc-annotated JavaScript into Markdown, so your
        reference lives next to your guides.
      </>
    ),
    href: '/packages/typedoc',
    art: (
      <div class="dk-art" aria-hidden="true">
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
  },
];

const Features = () => (
  <section class="dk-section dk-frame" id="features">
    <SectionHeader eyebrow="Features" title="Made for API reference." />
    <div class="dk-bento">
      {FEATURES.map(({ id, title, text, href, art }) => (
        <a class="dk-card" href={href} key={id}>
          <div class="dk-card__art">{art}</div>
          <div class="dk-card__copy">
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </a>
      ))}
    </div>
  </section>
);

const Start = () => (
  <section class="dk-section dk-frame" id="start">
    <SectionHeader eyebrow="Getting started" title="Docs in three steps." />
    <ol class="dk-steps">
      <li class="dk-step">
        <div>
          <h3>
            <span class="dk-step__number">1</span>
            Install
          </h3>
          <p class="dk-muted">
            The CLI and the generators that build the site.
          </p>
        </div>
        <InstallTabs id="dk-install-start" />
      </li>
      <li class="dk-step">
        <div>
          <h3>
            <span class="dk-step__number">2</span>
            Write
          </h3>
          <p class="dk-muted">
            Markdown, with headings written like signatures and lists like
            parameters. Or let @doc-kit/typedoc write it from your TypeScript or
            JSDoc.
          </p>
        </div>
        <CopyCode text={snippets.STEP_WRITE.trim()} label="Copy the Markdown">
          <Code code={snippets.STEP_WRITE} language="md" />
        </CopyCode>
      </li>
      <li class="dk-step">
        <div>
          <h3>
            <span class="dk-step__number">3</span>
            Generate
          </h3>
          <p class="dk-muted">
            The site and its search index, then a local preview.
          </p>
        </div>
        <CopyCode
          text={snippets.STEP_BUILD.trim().replace(/^\$ /gm, '')}
          label="Copy the commands"
        >
          <Code
            code={snippets.STEP_BUILD}
            language="sh"
            class="dk-code--wrap"
          />
        </CopyCode>
      </li>
    </ol>
    <div class="dk-actions dk-actions--center dk-actions--steps">
      <a class="dk-button dk-button--primary" href="/getting-started">
        Read the guide <Arrow />
      </a>
      <a class="dk-button" href="/configuration">
        Configuration reference
      </a>
    </div>
  </section>
);

const Closing = () => (
  <section class="dk-closing dk-frame">
    <div class="dk-closing__kitten">
      <Kitten id="dk-kitten-closing" variant="peek" />
    </div>
    <div class="dk-closing__card">
      <h2>Built in the open.</h2>
      <p class="dk-lead">
        doc-kit is an open source project of the Node.js organization, shaped by
        the people who use it. Bring an issue, an idea, a generator or a pull
        request.
      </p>
      <div class="dk-actions dk-actions--center">
        <a
          class="dk-button dk-button--primary"
          href={`https://github.com/${repository}`}
        >
          doc-kit on GitHub <Arrow />
        </a>
        <a
          class="dk-button"
          href={`https://github.com/${repository}/blob/main/CONTRIBUTING.md`}
        >
          Contributing guide
        </a>
      </div>
    </div>
  </section>
);

/**
 * doc-kit's home page.
 */
export default () => (
  <>
    <Hero />
    <Proof />
    <Stats />
    <Performance />
    <OneSource />
    <Features />
    <Start />
    <Closing />
  </>
);
