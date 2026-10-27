import { useEffect, useState } from 'preact/hooks';

/**
 * An icon button that copies some text, and shows a check for a moment. A
 * status next to it tells screen readers the text was copied.
 *
 * @param {{ text: string, label?: string }} props
 */
const CopyButton = ({ text, label = 'Copy the command' }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), 1600);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        class="dk-copy"
        onClick={copy}
        aria-label={copied ? 'Copied' : label}
        data-copied={copied}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {copied ? (
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          ) : (
            <>
              <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
              <path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
            </>
          )}
        </svg>
      </button>
      {/* Always rendered, so screen readers see its text change */}
      <span class="dk-sr-only" role="status">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
};

export default CopyButton;
