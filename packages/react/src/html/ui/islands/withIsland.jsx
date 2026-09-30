import { toChildArray } from 'preact';

import { server } from '#theme/config';

/**
 * Serializes island props for the inline `application/json` script.
 *
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
const serializeProps = props =>
  JSON.stringify(props).replaceAll('<', '\\u003c');

/**
 * Marks a component as an island
 *
 * Children are server-rendered inside an `<island-slot>` and adopted as-is on
 * hydration, so static markup is never shipped as JavaScript to be rebuilt.
 *
 * @param {import('preact').ComponentType} Component
 * @param {object} options
 * @param {string} options.name - Key into `loaders.mjs`.
 * @param {Record<string, string|true>} options.on - is-land loading conditions
 *   without the `on:` prefix, e.g. `{ idle: true }`.
 * @see https://is-land.11ty.dev/
 */
export default (Component, { name, on }) => {
  if (!server) {
    return Component;
  }

  const conditions = Object.fromEntries(
    Object.entries(on).map(([condition, value]) => [
      `on:${condition}`,
      value === true ? '' : value,
    ])
  );

  return ({ children, ...props }) => (
    <is-land {...conditions} type="preact" data-island-name={name}>
      {Object.keys(props).length > 0 && (
        <script
          type="application/json"
          data-island-props
          dangerouslySetInnerHTML={{ __html: serializeProps(props) }}
        />
      )}

      <Component {...props}>
        {toChildArray(children).map((child, index) => (
          // eslint-disable-next-line react-x/no-array-index-key -- static server-rendered children never reorder
          <island-slot defer-hydration key={index}>
            {child}
          </island-slot>
        ))}
      </Component>
    </is-land>
  );
};
