import BaseCodeBox from '@node-core/ui-components/Common/BaseCodeBox';

import { STATIC_DATA } from '../constants.mjs';

const languageDisplayNameMap = new Map(STATIC_DATA.shikiDisplayNameMap);

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
      onCopy={navigator.clipboard?.writeText}
      language={getLanguageDisplayName(language)}
      className={className}
      copyButtonLabel="Copy to clipboard"
      copiedButtonLabel="Copied to clipboard!"
      {...props}
    />
  );
};
