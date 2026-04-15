import BaseCodeBox from '@node-core/ui-components/Common/BaseCodeBox';

import { languageDisplayNameMap } from '#theme/config';

/**
 * Get the display name of a language
 * @param {string} language - The language ID
 */
export const getLanguageDisplayName = language => {
  const entry = Array.from(languageDisplayNameMap.entries()).find(([aliases]) =>
    aliases.includes(language.toLowerCase())
  );

  return entry?.[1] ?? language.toLowerCase();
};

/** @param {import('react').PropsWithChildren<{ className: string }>} props */
export default ({ className, ...props }) => {
  const matches = className?.match(/language-(?<language>[a-zA-Z]+)/);

  const language = matches?.groups?.language ?? '';

  return (
    <BaseCodeBox
      onCopy={text => navigator.clipboard?.writeText(text)}
      language={getLanguageDisplayName(language)}
      className={className}
      copyButtonLabel="Copy to clipboard"
      copiedButtonLabel="Copied to clipboard!"
      {...props}
    />
  );
};
