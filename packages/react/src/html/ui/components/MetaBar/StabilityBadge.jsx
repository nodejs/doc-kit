import Badge from '@node-core/ui-components/Common/Badge';
import { createPortal } from 'preact/compat';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';

import styles from './index.module.css';
import withIsland from '../../islands/withIsland.jsx';

const VIEWPORT_MARGIN = 8;

/**
 * Renders a stability badge with a tooltip that is portalled outside the
 * MetaBar's scroll container.
 * @param {{ label: string, tooltip: string, ariaLabel: string, kind: string }} props
 */
const StabilityBadge = ({ label, tooltip, ariaLabel, kind }) => {
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const content = tooltipRef.current;

    if (!trigger || !content) {
      return;
    }

    const triggerBox = trigger.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const centeredLeft =
      triggerBox.left + triggerBox.width / 2 - contentBox.width / 2;
    const left = Math.min(
      Math.max(centeredLeft, VIEWPORT_MARGIN),
      window.innerWidth - contentBox.width - VIEWPORT_MARGIN
    );
    const below = triggerBox.bottom + VIEWPORT_MARGIN;
    const fitsBelow =
      below + contentBox.height <= window.innerHeight - VIEWPORT_MARGIN;

    setPosition({
      left,
      top: fitsBelow
        ? below
        : triggerBox.top - contentBox.height - VIEWPORT_MARGIN,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  const closeTooltip = () => {
    setOpen(false);
    setPosition(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.tooltipTrigger}
        aria-label={ariaLabel}
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={closeTooltip}
        onFocus={() => setOpen(true)}
        onBlur={closeTooltip}
      >
        <Badge size="small" kind={kind}>
          {label}
        </Badge>
      </span>

      {open &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className={styles.tooltipContent}
            style={position ?? { visibility: 'hidden' }}
          >
            {tooltip}
          </span>,
          document.body
        )}
    </>
  );
};

export default withIsland(StabilityBadge, {
  name: 'StabilityBadge',
  on: { idle: true },
});
