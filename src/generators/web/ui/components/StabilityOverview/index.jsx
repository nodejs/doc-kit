import BadgeGroup from '@node-core/ui-components/Common/BadgeGroup';

const STABILITY_KINDS = ['error', 'warning', 'default', 'info'];

/**
 * Renders the module stability overview table.
 * @param {{ entries: Array<{ api: string, name: string, stabilityIndex: number, stabilityDescription: string }> }} props
 */
export default ({ entries = [] }) => (
  <table>
    <thead>
      <tr>
        <th>API</th>
        <th>Stability</th>
      </tr>
    </thead>
    <tbody>
      {entries.map(({ api, name, stabilityIndex, stabilityDescription }) => (
        <tr key={api}>
          <td>
            <a href={`${api}.html`}>{name}</a>
          </td>
          <td>
            <BadgeGroup
              as="span"
              size="small"
              kind={STABILITY_KINDS[stabilityIndex] ?? 'success'}
              badgeText={stabilityIndex}
            >
              {stabilityDescription}
            </BadgeGroup>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
