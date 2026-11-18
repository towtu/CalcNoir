/**
 * Where a tab sits inside the raised bar.
 *
 * `RaisedTabBar` needs this to place the liquid dip under the active tab, and
 * the navigation tour needs the same numbers to point at a tab from outside
 * the bar. They are exported together so the two can never drift apart: a
 * pointer that is eight pixels off reads as a bug in the tour, not in the bar.
 */

/** `RaisedTabBar`'s own horizontal inset — the gap between screen and bar. */
export const TAB_BAR_EDGE = 16;
/** The padding inside the bar, before the first tab. */
export const TAB_BAR_INSET = 12;
/** The bar's row height: `styles.item`'s `minHeight`. */
export const TAB_BAR_HEIGHT = 84;
/** The space above the bar, kept clear so the raised circle can lift into it. */
export const TAB_BAR_LIFT = 24;

/**
 * The centre of one tab, in the bar's own coordinates. Tabs are equal-width
 * (`flex: 1`) inside the bar's padding, so the centre is the midpoint of the
 * index-th slice.
 */
export function tabCenter(
  barWidth: number,
  count: number,
  index: number,
): number {
  return (
    TAB_BAR_INSET +
    ((barWidth - TAB_BAR_INSET * 2) / count) * (index + 0.5)
  );
}
