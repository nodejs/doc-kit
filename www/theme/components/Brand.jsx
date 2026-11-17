// doc-kit's logo, drawn in the current text color, and its mascot, drawn in
// `--dk-kitten-ink` and `--dk-kitten-paper`, so both follow the color scheme.

/**
 * The cat's head on a 32 × 32 grid: its outline, and its eyes and nose, cut
 * out of it in the logo, drawn over it in the mascot.
 */
export const CAT = {
  head: 'M5.2 3.1 11.6 8.6Q16 7.2 20.4 8.6L26.8 3.1Q27.9 2.4 28 3.7L28.5 14.8C29.2 22.6 23.4 29 16 29S2.8 22.6 3.5 14.8L4 3.7Q4.1 2.4 5.2 3.1Z',
  eyes: 'M11 14.2c1.5 1.6 1.5 5.8 0 7.4-1.5-1.6-1.5-5.8 0-7.4Zm10 0c1.5 1.6 1.5 5.8 0 7.4-1.5-1.6-1.5-5.8 0-7.4Z',
  nose: 'M14.6 22.9Q16 22.5 17.4 22.9Q16.9 24 16 24.5Q15.1 24 14.6 22.9Z',
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
