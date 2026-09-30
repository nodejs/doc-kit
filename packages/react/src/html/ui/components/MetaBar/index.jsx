import { CodeBracketIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Badge from '@node-core/ui-components/Common/Badge';
import MetaBar from '@node-core/ui-components/Containers/MetaBar';
import GitHubIcon from '@node-core/ui-components/Icons/Social/GitHub';

import styles from './index.module.css';
import { relativeOrAbsolute } from '../../utils/relativeOrAbsolute.mjs';
import { STABILITY_KINDS, STABILITY_LABELS } from '../constants.mjs';

import { editURL, chunks } from '#theme/config';

const iconMap = {
  JSON: CodeBracketIcon,
  MD: DocumentIcon,
};

/**
 * Renders a heading value with an optional stability badge
 * @param {{ value: string, stability: number }} props
 */
const HeadingValue = ({ value, stability }) => {
  if (stability === 2) {
    return value;
  }

  const label = STABILITY_LABELS[stability];

  return (
    <>
      {value}

      <Badge
        size="small"
        className={styles.badge}
        kind={STABILITY_KINDS[stability]}
        data-tooltip={label}
        aria-label={label ? `Stability: ${label}` : undefined}
        tabIndex={0}
      >
        {label?.[0]}
      </Badge>
    </>
  );
};

/**
 * MetaBar component that displays table of contents and page metadata
 * @param {{ metadata: import('../../types').SerializedMetadata, headings: Array, readingTime?: string }} props
 */
export default ({ metadata, headings = [], readingTime }) => {
  // A chunk page is a section of its module page: the source file, JSON and
  // Markdown renderings, and edit link are all the module's.
  const modulePath = metadata.chunk?.path ?? metadata.path;

  const editThisPage = editURL?.replace('{path}', modulePath);

  const toModuleFile = extension =>
    metadata.chunk
      ? `${relativeOrAbsolute(modulePath, metadata.path)}${extension}`
      : `${metadata.basename}${extension}`;

  const viewAs = [
    ['JSON', toModuleFile('.json')],
    ['MD', toModuleFile('.md')],
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
        'Part Of': metadata.chunk && (
          <a href={`${toModuleFile('.html')}#${metadata.chunk.slug}`}>
            {chunks[modulePath]?.label ?? metadata.chunk.api}
          </a>
        ),
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
