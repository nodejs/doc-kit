/* eslint-disable react-x/no-use-context, react-x/no-context-provider -- preact/compat does not export `use`, so React 19 patterns are unavailable at runtime */
import { CodeBracketIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Badge from '@node-core/ui-components/Common/Badge';
import MetaBar from '@node-core/ui-components/Containers/MetaBar';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';
import { createContext, useContext } from 'react';

import styles from './index.module.css';
import { useScrollSpy } from '../../hooks/useScrollSpy.mjs';

const iconMap = {
  JSON: CodeBracketIcon,
  MD: DocumentIcon,
};

/**
 * @typedef MetaBarProps
 * @property {Array<import('@vcarl/remark-headings').Heading & { stability: string }>} headings - Array of page headings for table of contents
 * @property {string} addedIn - Version or date when feature was added
 * @property {string} readingTime - Estimated reading time for the page
 * @property {Array<[string, string]>} viewAs - Array of [title, path] tuples for view options
 * @property {string} editThisPage - URL for editing the current page
 */

const STABILITY_KINDS = ['error', 'warning', null, 'info'];
const STABILITY_LABELS = ['D', 'E', null, 'L'];
const STABILITY_TOOLTIPS = ['Deprecated', 'Experimental', null, 'Legacy'];

const ActiveSlugContext = createContext(null);

/**
 * Renders a heading value with an optional stability badge
 * @param {{ value: string, stability: number }} props
 */
const HeadingValue = ({ value, stability }) => {
  if (stability === 2) {
    return value;
  }

  const ariaLabel = STABILITY_TOOLTIPS[stability]
    ? `Stability: ${STABILITY_TOOLTIPS[stability]}`
    : undefined;

  return (
    <>
      {value}

      <Badge
        size="small"
        className={styles.badge}
        kind={STABILITY_KINDS[stability]}
        data-tooltip={STABILITY_TOOLTIPS[stability]}
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {STABILITY_LABELS[stability]}
      </Badge>
    </>
  );
};

/**
 * Anchor element that highlights itself when it matches the active TOC slug.
 * @param {{ href: string, className?: string }} props
 */
const ActiveLink = ({ href, className, ...props }) => {
  const activeSlug = useContext(ActiveSlugContext);

  return (
    <a
      href={href}
      aria-current={href === `#${activeSlug}` ? 'true' : undefined}
      className={[className, href === `#${activeSlug}` ? styles.tocActive : '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
};

/**
 * MetaBar component that displays table of contents and page metadata
 * @param {MetaBarProps} props - Component props
 */
export default ({
  headings = [],
  addedIn,
  readingTime,
  viewAs = [],
  editThisPage,
}) => {
  const activeSlug = useScrollSpy(headings);

  return (
    <ActiveSlugContext.Provider value={activeSlug}>
      <MetaBar
        heading="Table of Contents"
        as={ActiveLink}
        headings={{
          items: headings.map(({ value, stability, ...heading }) => ({
            ...heading,
            value: <HeadingValue value={value} stability={stability} />,
          })),
        }}
        items={{
          'Reading Time': readingTime,
          'Added In': addedIn,
          'View As': (
            <ol>
              {viewAs.map(([title, path]) => {
                const Icon = iconMap[title];

                return (
                  <li key={title}>
                    <a href={path}>
                      {Icon && <Icon className={styles.icon} />}

                      {title}
                    </a>
                  </li>
                );
              })}
            </ol>
          ),
          Contribute: (
            <>
              <GitHubIcon className="fill-neutral-700 dark:fill-neutral-100" />

              <a href={editThisPage}>Edit this page</a>
            </>
          ),
        }}
      />
    </ActiveSlugContext.Provider>
  );
};
