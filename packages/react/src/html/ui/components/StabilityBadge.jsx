import Badge from '@node-core/ui-components/Common/Badge';

const STABILITY_KINDS = ['error', 'warning', null, 'info'];
const STABILITY_LABELS = ['D', 'E', null, 'L'];
const STABILITY_TOOLTIPS = ['Deprecated', 'Experimental', null, 'Legacy'];

/**
 * Compact stability badge used next to API names
 *
 * @param {{ stability: number, className?: string }} props
 */
export default ({ stability, className }) => {
  if (!STABILITY_LABELS[stability]) {
    return null;
  }

  return (
    <Badge
      size="small"
      className={className}
      kind={STABILITY_KINDS[stability]}
      data-tooltip={STABILITY_TOOLTIPS[stability]}
      aria-label={`Stability: ${STABILITY_TOOLTIPS[stability]}`}
      tabIndex={0}
    >
      {STABILITY_LABELS[stability]}
    </Badge>
  );
};
