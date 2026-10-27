// doc-kit's logo, drawn in the current text color, and its mascot, drawn in
// `--dk-kitten-ink` and `--dk-kitten-paper`, so both follow the color scheme.

/**
 * The cat's head on a 32 × 32 grid: its outline, and its eyes and nose, cut
 * out of it in the logo, drawn over it in the mascot.
 */
export const CAT = {
  head: 'M4.5 3 12 9h8l7.5-6 1 13c0 7-5.5 13.5-12.5 13.5S3.5 23 3.5 16Z',
  eyes: 'M11 14.5c1.4 1.5 1.4 5.5 0 7-1.4-1.5-1.4-5.5 0-7Zm10 0c1.4 1.5 1.4 5.5 0 7-1.4-1.5-1.4-5.5 0-7Z',
  nose: 'M14.7 23h2.6L16 24.6Z',
};

/**
 * The cat on its own: the mark in the wordmark.
 *
 * @param {{ class?: string }} props
 */
export const CatMark = props => (
  <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
    <path
      d={`${CAT.head}${CAT.eyes}${CAT.nose}`}
      fill="currentColor"
      fill-rule="evenodd"
    />
  </svg>
);

/**
 * The cat and the `doc-kit` name, set in the site's typeface.
 *
 * @param {{ class?: string }} props
 */
export const Wordmark = ({ class: className = '' }) => (
  <span class={`dk-wordmark ${className}`}>
    <CatMark class="dk-wordmark__cat" />
    <span class="dk-wordmark__name">doc-kit</span>
  </span>
);

/**
 * Kit, the doc-kit cat, drawn large: it blinks now and then, and snores when
 * asleep (see `brand.css`). `peek` hides the bottom of its head behind
 * whatever it sits on, with its paws over the edge, and `sleep` closes its
 * eyes.
 *
 * @param {{ id?: string, variant?: 'peek' | 'sleep' | 'head', class?: string }} props
 */
export const Kitten = ({
  id = 'dk-kitten',
  variant = 'head',
  class: className = '',
  ...props
}) => {
  const peek = variant === 'peek';

  return (
    <svg
      viewBox={peek ? '0 0 32 27' : '0 0 36 32'}
      class={`dk-kitten dk-kitten--${variant} ${className}`}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="-4" y="-4" width="40" height="27.5" />
        </clipPath>
      </defs>

      <g clip-path={peek ? `url(#${id}-clip)` : undefined}>
        <path class="dk-kitten__head" d={CAT.head} />
        {variant === 'sleep' ? (
          <path
            class="dk-kitten__closed"
            d="M9 18.5q2 1.6 4 0m6 0q2 1.6 4 0"
            fill="none"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        ) : (
          <path class="dk-kitten__eyes" d={CAT.eyes} />
        )}
        <path class="dk-kitten__nose" d={CAT.nose} />
      </g>

      {peek && (
        <g class="dk-kitten__paws">
          <rect x="6" y="22" width="7.5" height="5" rx="2.5" />
          <rect x="18.5" y="22" width="7.5" height="5" rx="2.5" />
        </g>
      )}

      {variant === 'sleep' && (
        <g
          class="dk-kitten__zzz"
          font-family="var(--dk-font-mono)"
          font-weight="600"
        >
          <text x="28" y="9" font-size="5">
            z
          </text>
          <text x="31.5" y="4.5" font-size="3.6">
            z
          </text>
        </g>
      )}
    </svg>
  );
};
