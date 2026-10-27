/**
 * Moves through a tablist with the arrow keys, Home and End, as the WAI-ARIA
 * tabs pattern does: the tab it lands on is selected and focused.
 *
 * @param {KeyboardEvent} event - A keydown on the tablist
 * @param {(index: number) => void} select
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export const onTablistKeyDown = (event, select) => {
  const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.target);
  const last = tabs.length - 1;

  const next = {
    ArrowLeft: index > 0 ? index - 1 : last,
    ArrowRight: index < last ? index + 1 : 0,
    Home: 0,
    End: last,
  }[event.key];

  if (index === -1 || next === undefined) {
    return;
  }

  event.preventDefault();
  select(next);
  tabs[next].focus();
};
