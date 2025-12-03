import { stringEndsWith } from '../compat.ts';
import { FALLBACK_COLUMN_WIDTH, MAX_COLUMN_WIDTH_PERCENT } from '../constants.ts';

export type GroupWidth = number | `${number}%` | 'max';

export function calculateColumnWidth(groupWidth: GroupWidth, terminalWidth: number, maxGroupLength: number): number {
  if (typeof groupWidth === 'number') return groupWidth;
  if (groupWidth === 'max') return Math.min(maxGroupLength, Math.floor(terminalWidth * MAX_COLUMN_WIDTH_PERCENT));
  if (typeof groupWidth === 'string' && stringEndsWith(groupWidth, '%')) {
    const pct = parseInt(groupWidth, 10) / 100;
    return Math.floor(terminalWidth * pct);
  }
  return FALLBACK_COLUMN_WIDTH;
}
