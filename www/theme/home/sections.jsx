// The sections of the home page, `www/pages/index.mdx`, which holds their
// words and code: these lay them out, and bring the numbers from `data.mjs`.

import CodeTabs from '@doc-kit/generator-react/html/ui/components/CodeTabs.jsx';
import { toChildArray } from 'preact';

import { Kitten } from '../components/Brand.jsx';
import HeroFlow from '../components/HeroFlow.jsx';
import PipelineFlow from '../components/PipelineFlow.jsx';
import {
  BENCHMARK,
  GENERATOR_COUNT,
  NODE_DOCS_REQUESTS,
  SHOWCASE,
  SITE_BENCHMARK,
} from '../data.mjs';
import ART from './art.jsx';

/**
 * The facts a page can state, by name: a value and its unit.
 */
const FACTS = {
  requests: [NODE_DOCS_REQUESTS, '+'],
  generators: [GENERATOR_COUNT],
  javascript: [BENCHMARK.clientKilobytes, 'kB'],
};

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

const formatSeconds = seconds => `${seconds.toFixed(1)} s`;

/**
 * The first section: the title, with the announcement above it, then the
 * page's lead, buttons and install command, beside the hero animation.
 *
 * @param {{ badge: string, badgeLink: string, title: string, accent: string, children: import('preact').ComponentChildren }} props
 */
export const Hero = ({ badge, badgeLink, title, accent, children }) => (
  <section class="dk-hero dk-frame">
    <div class="dk-hero__copy">
      <a class="dk-pill" href={badgeLink}>
        <span class="dk-pill__dot" aria-hidden="true" />
        {badge}
        <Arrow />
      </a>
      <h1 class="dk-hero__title">
        {title}
        <br />
        <span class="dk-hero__soft">{accent}</span>
      </h1>
      {children}
    </div>
    <div class="dk-hero__visual">
      <HeroFlow />
    </div>
  </section>
);

/**
 * A row of buttons.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const Actions = ({ children }) => (
  <div class="dk-actions">{children}</div>
);

/**
 * A link that looks like a button. The primary one points onward.
 *
 * @param {{ href: string, primary?: boolean, children: import('preact').ComponentChildren }} props
 */
export const Button = ({ href, primary = false, children }) => (
  <a class={primary ? 'dk-button dk-button--primary' : 'dk-button'} href={href}>
    {children}
    {primary && <Arrow />}
  </a>
);

/**
 * The strip of sites built with doc-kit, under the hero.
 *
 * @param {{ title: string }} props
 */
export const UsedBy = ({ title }) => (
  <section class="dk-proof dk-frame" aria-label={title}>
    <p class="dk-proof__title">{title}</p>
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

/**
 * A band of numbers.
 *
 * @param {{ label: string, children: import('preact').ComponentChildren }} props
 */
export const Stats = ({ label, children }) => (
  <section class="dk-stats dk-frame" aria-label={label}>
    {children}
  </section>
);

/**
 * One of the numbers, by name (see `FACTS`), above what it counts.
 *
 * @param {{ fact: keyof typeof FACTS, children: import('preact').ComponentChildren }} props
 */
export const Stat = ({ fact, children }) => {
  const [value, unit] = FACTS[fact];

  return (
    <div class="dk-stat">
      <p class="dk-stat__value">
        {value}
        {unit && <span>{unit}</span>}
      </p>
      <div class="dk-stat__label">{children}</div>
    </div>
  );
};

/**
 * A number in a sentence, by name (see `FACTS`).
 *
 * @param {{ name: keyof typeof FACTS }} props
 */
export const Fact = ({ name }) => FACTS[name].join(' ');

/**
 * A section of the page, with its title over its content. A paragraph right
 * under the title is its lead.
 *
 * @param {{ id: string, eyebrow: string, title: string, children: import('preact').ComponentChildren }} props
 */
export const Section = ({ id, eyebrow, title, children }) => (
  <section class="dk-section dk-frame" id={id}>
    <header class="dk-section__header">
      <p class="dk-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </header>
    {children}
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
        Median of {benchmark.runCount} clean builds on an {benchmark.machine}{' '}
        and <span class="dk-nowrap">doc-kit</span>{' '}
        <code>{benchmark.commit}</code>.{' '}
        <a href="/introduction#performance">How we measured</a>
      </p>
    </div>
  );
};

/**
 * The build at work, with the notes on it given as children, beside the
 * benchmarks of this site and of the Node.js API docs.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const Performance = ({ children }) => (
  <div class="dk-split">
    <div class="dk-panel dk-flow">
      <PipelineFlow
        pages={SITE_BENCHMARK.pages}
        documents={SITE_BENCHMARK.documents}
      />
      {children}
    </div>

    <div class="dk-benchmarks">
      <CodeTabs languages="text|text" displayNames="This site|Node.js API docs">
        <Bench benchmark={SITE_BENCHMARK} />
        <Bench benchmark={BENCHMARK} />
      </CodeTabs>
    </div>
  </div>
);

/**
 * The sources, then what doc-kit makes of them, with an arrow between.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const Formats = ({ children }) => {
  const [sources, ...outputs] = toChildArray(children);

  return (
    <div class="dk-source">
      {sources}
      <div class="dk-source__arrow" aria-hidden="true">
        <span />
      </div>
      {outputs}
    </div>
  );
};

/**
 * The feature cards.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const Features = ({ children }) => (
  <div class="dk-bento">{children}</div>
);

/**
 * A feature card, with its illustration (see `art.jsx`), linking to its docs.
 *
 * @param {{ art: keyof typeof ART, title: string, href: string, children: import('preact').ComponentChildren }} props
 */
export const Feature = ({ art, title, href, children }) => (
  <a class="dk-card" href={href}>
    <div class="dk-card__art" aria-hidden="true">
      {ART[art]}
    </div>
    <div class="dk-card__copy">
      <h3>{title}</h3>
      {children}
    </div>
  </a>
);

/**
 * Numbered steps.
 *
 * @param {{ children: import('preact').ComponentChildren }} props
 */
export const Steps = ({ children }) => <ol class="dk-steps">{children}</ol>;

/**
 * A step: its title and what it does, beside its code.
 *
 * @param {{ title: string, children: import('preact').ComponentChildren }} props
 */
export const Step = ({ title, children }) => (
  <li class="dk-step">
    <h3>
      <span class="dk-step__number" aria-hidden="true" />
      {title}
    </h3>
    {children}
  </li>
);

/**
 * The last section: Kit, peeking over a card.
 *
 * @param {{ title: string, children: import('preact').ComponentChildren }} props
 */
export const Closing = ({ title, children }) => (
  <section class="dk-closing dk-frame">
    <div class="dk-closing__kitten">
      <Kitten id="dk-kitten-closing" variant="peek" />
    </div>
    <div class="dk-closing__card">
      <h2>{title}</h2>
      {children}
    </div>
  </section>
);
