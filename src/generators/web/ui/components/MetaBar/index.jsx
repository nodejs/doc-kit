import { CodeBracketIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Badge from '@node-core/ui-components/Common/Badge';
import MetaBar from '@node-core/ui-components/Containers/MetaBar';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';
import { useEffect, useState } from 'react';

import styles from './index.module.css';

import { editURL } from '#theme/config';

const iconMap = {
  JSON: CodeBracketIcon,
  MD: DocumentIcon,
};

const STABILITY_KINDS = ['error', 'warning', null, 'info'];
const STABILITY_LABELS = ['D', 'E', null, 'L'];
const STABILITY_TOOLTIPS = ['Deprecated', 'Experimental', null, 'Legacy'];
const SCROLL_OFFSET = 96;

const toHeadingIds = headings =>
  headings
    .map(heading => heading.data?.id)
    .filter(id => typeof id === 'string' && id.length > 0);

const useActiveHeadingId = headings => {
  const [activeHeadingId, setActiveHeadingId] = useState('');

  useEffect(() => {
    const headingIds = toHeadingIds(headings);

    if (headingIds.length === 0) {
      setActiveHeadingId('');
      return;
    }

    let frame = 0;

    const updateActiveHeading = () => {
      let nextActiveHeadingId = '';
      frame = 0;

      for (const id of headingIds) {
        const element = document.getElementById(id);

        if (!element) {
          continue;
        }

        if (
          !nextActiveHeadingId ||
          element.getBoundingClientRect().top <= SCROLL_OFFSET
        ) {
          nextActiveHeadingId = id;
        }
      }

      setActiveHeadingId(nextActiveHeadingId);
    };

    const scheduleActiveHeadingUpdate = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(updateActiveHeading);
      }
    };

    updateActiveHeading();
    window.addEventListener('hashchange', scheduleActiveHeadingUpdate);
    window.addEventListener('scroll', scheduleActiveHeadingUpdate, {
      passive: true,
    });

    return () => {
      window.removeEventListener('hashchange', scheduleActiveHeadingUpdate);
      window.removeEventListener('scroll', scheduleActiveHeadingUpdate);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [headings]);

  return activeHeadingId;
};

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
 * @param {{ metadata: import('../../types').SerializedMetadata, headings: Array, readingTime: string }} props
 */
export default ({ metadata, headings = [], readingTime }) => {
  const editThisPage = editURL.replace('{path}', metadata.path);
  const activeHeadingId = useActiveHeadingId(headings);

  const viewAs = [
    ['JSON', `${metadata.basename}.json`],
    ['MD', `${metadata.basename}.md`],
  ];

  const ActiveHeadingLink = ({ href, className, ...props }) => {
    const headingId = href?.startsWith('#') ? href.slice(1) : '';
    const isActive = headingId === activeHeadingId;
    const activeClassName = isActive ? styles.activeHeading : '';

    return (
      <a
        {...props}
        href={href}
        className={[className, activeClassName].filter(Boolean).join(' ')}
        aria-current={isActive ? 'location' : undefined}
        data-active-heading={isActive ? true : undefined}
      />
    );
  };

  return (
    <MetaBar
      as={ActiveHeadingLink}
      heading="Table of Contents"
      headings={{
        items: headings.map(({ value, stability, ...heading }) => ({
          ...heading,
          value: <HeadingValue value={value} stability={stability} />,
        })),
      }}
      items={{
        'Reading Time': readingTime,
        'Added In': metadata.added ?? metadata.introduced_in,
        'View As': !metadata.synthetic && (
          <ol>
            {viewAs.map(([viewTitle, path]) => {
              const Icon = iconMap[viewTitle];

              return (
                <li key={viewTitle}>
                  <a href={path}>
                    {Icon && <Icon className={styles.icon} />}

                    {viewTitle}
                  </a>
                </li>
              );
            })}
          </ol>
        ),
        Contribute: !metadata.synthetic && (
          <>
            <GitHubIcon className="fill-neutral-700 dark:fill-neutral-100" />

            <a href={editThisPage}>Edit this page</a>
          </>
        ),
      }}
    />
  );
};
