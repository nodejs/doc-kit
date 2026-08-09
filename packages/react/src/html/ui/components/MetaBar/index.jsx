import { CodeBracketIcon, DocumentIcon } from '@heroicons/react/24/outline';
import MetaBar from '@node-core/ui-components/Containers/MetaBar';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import styles from './index.module.css';
import StabilityBadge from './StabilityBadge.jsx';

import { editURL } from '#theme/config';

const iconMap = {
  JSON: CodeBracketIcon,
  MD: DocumentIcon,
};

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

  const tooltip = STABILITY_TOOLTIPS[stability];
  const ariaLabel = tooltip ? `Stability: ${tooltip}` : undefined;

  return (
    <>
      {value}

      <StabilityBadge
        kind={STABILITY_KINDS[stability]}
        label={STABILITY_LABELS[stability]}
        tooltip={tooltip}
        ariaLabel={ariaLabel}
      />
    </>
  );
};

/**
 * MetaBar component that displays table of contents and page metadata
 * @param {{ metadata: import('../../types').SerializedMetadata, headings: Array, readingTime: string }} props
 */
export default ({ metadata, headings = [], readingTime }) => {
  const editThisPage = editURL?.replace('{path}', metadata.path);

  const viewAs = [
    ['JSON', `${metadata.basename}.json`],
    ['MD', `${metadata.basename}.md`],
  ];

  return (
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
        Contribute: !metadata.synthetic && editThisPage && (
          <>
            <GitHubIcon className="fill-neutral-700 dark:fill-neutral-100" />

            <a href={editThisPage}>Edit this page</a>
          </>
        ),
      }}
    />
  );
};
