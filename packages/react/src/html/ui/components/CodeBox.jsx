import BaseCodeBox from '@node-core/ui-components/Common/BaseCodeBox';

import withIsland from '../islands/withIsland.jsx';

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
const CodeBox = ({ className, ...props }) => {
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

// The only interactive part is the copy button; the highlighted code itself is
// static markup, so it stays in the server output and is never re-rendered.
export default withIsland(CodeBox, {
  name: 'CodeBox',
  on: { interaction: 'pointerover,focusin,touchstart' },
});
