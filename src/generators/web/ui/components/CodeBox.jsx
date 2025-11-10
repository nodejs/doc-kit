import { CodeBracketIcon } from '@heroicons/react/24/outline';
import BaseCodeBox from '@node-core/ui-components/Common/BaseCodeBox';
import styles from '@node-core/ui-components/Common/BaseCodeBox/index.module.css';
import { useNotification } from '@node-core/ui-components/Providers/NotificationProvider';

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
export default ({ className, children, ...props }) => {
  const matches = className?.match(/language-(?<language>[a-zA-Z]+)/);

  const language = matches?.groups?.language ?? '';

  const notify = useNotification();

  const onCopy = async text => {
    await navigator.clipboard.writeText(text);

    notify({
      duration: 3000,
      message: (
        <div className="flex items-center gap-3">
          <CodeBracketIcon className={styles.icon} />
          Copied to clipboard
        </div>
      ),
    });
  };

  return (
    <>
      <BaseCodeBox
        onCopy={onCopy}
        language={getLanguageDisplayName(language)}
        className={className}
        buttonText="Copy to clipboard"
        {...props}
      >
        {children}
      </BaseCodeBox>
    </>
  );
};
