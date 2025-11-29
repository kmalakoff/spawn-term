import ansiRegex from './ansiRegex.ts';

const regex = ansiRegex();

/**
 * Get the visible length of a string, ignoring ANSI escape codes.
 */
export function visibleLength(str: string): number {
  return str.replace(regex, '').length;
}

/**
 * Clip text to a maximum visible width, accounting for ANSI escape codes.
 * Adds ellipsis (…) if truncated.
 */
export function clipText(str: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (maxWidth === 1) return '…';

  const stripped = str.replace(regex, '');
  if (stripped.length <= maxWidth) return str;

  // Need to truncate - walk through and preserve ANSI codes
  let visibleCount = 0;
  let result = '';
  let i = 0;

  while (i < str.length && visibleCount < maxWidth - 1) {
    // Check for ANSI escape sequence (ESC [ params m)
    const remaining = str.slice(i);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape requires control char
    const match = remaining.match(/^(\u001B\[[0-9;]*m)/);

    if (match) {
      // Include the ANSI code in output but don't count toward visible length
      result += match[1];
      i += match[1].length;
    } else {
      // Regular character
      result += str[i];
      visibleCount++;
      i++;
    }
  }

  return `${result}…`;
}
