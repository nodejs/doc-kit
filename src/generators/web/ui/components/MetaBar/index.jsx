import { CodeBracketIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Badge from '@node-core/ui-components/Common/Badge';
import MetaBar from '@node-core/ui-components/Containers/MetaBar';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import styles from './index.module.css';

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
 * MetaBar component that displays table of contents and page metadata
 * @param {MetaBarProps} props - Component props
 */
export default ({
  headings = [],
  addedIn,
  readingTime,
  viewAs = [],
  editThisPage,
}) => (
  <MetaBar
    heading="Table of Contents"
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
);
