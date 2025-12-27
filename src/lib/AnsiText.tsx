import { Text } from 'ink';
import { Fragment, memo } from 'react';

// ANSI color codes to Ink color mapping
// Based on standard ANSI SGR (Select Graphic Rendition) parameters
const ANSI_COLORS: Record<string, string> = {
  '\x1b[30m': 'black',
  '\x1b[31m': 'red',
  '\x1b[32m': 'green',
  '\x1b[33m': 'yellow',
  '\x1b[34m': 'blue',
  '\x1b[35m': 'magenta',
  '\x1b[36m': 'cyan',
  '\x1b[37m': 'white',
  // Bright colors
  '\x1b[90m': 'gray',
  '\x1b[91m': 'redBright',
  '\x1b[92m': 'greenBright',
  '\x1b[93m': 'yellowBright',
  '\x1b[94m': 'blueBright',
  '\x1b[95m': 'magentaBright',
  '\x1b[96m': 'cyanBright',
  '\x1b[97m': 'whiteBright',
};

// ANSI style codes
const ANSI_STYLES: Record<string, string> = {
  '\x1b[1m': 'bold',
  '\x1b[2m': 'dim',
  '\x1b[3m': 'italic',
  '\x1b[4m': 'underline',
  '\x1b[9m': 'strikethrough',
  '\x1b[7m': 'inverse',
};

// Reset codes
const RESET_CODES = ['\x1b[0m', '\x1b[39m', '\x1b[49m'];

type TextSegment = {
  text: string;
  color?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
};

/**
 * Parse a string with ANSI codes into segments with styling information.
 */
function parseAnsiString(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment: TextSegment = { text: '' };
  let i = 0;

  while (i < input.length) {
    // Check for ANSI escape sequence
    if (input[i] === '\x1b' && input[i + 1] === '[') {
      // Find the end of the escape sequence (ends with a letter)
      let j = i + 2;
      while (j < input.length && !/[a-zA-Z]/.test(input[j])) {
        j++;
      }
      j++; // Include the letter

      const code = input.slice(i, j);

      // If we have accumulated text, save it
      if (currentSegment.text.length > 0) {
        segments.push(currentSegment);
        currentSegment = {
          text: '',
          ...Object.fromEntries(
            Object.entries(currentSegment)
              .filter(([key]) => key !== 'text')
              .filter(([_, value]) => value !== undefined)
          ),
        } as TextSegment;
      }

      // Apply the style
      if (RESET_CODES.includes(code)) {
        // Reset all styles
        currentSegment = { text: '' };
      } else if (ANSI_COLORS[code]) {
        currentSegment.color = ANSI_COLORS[code];
      } else if (ANSI_STYLES[code]) {
        const style = ANSI_STYLES[code] as keyof Omit<TextSegment, 'text' | 'color'>;
        currentSegment[style] = true;
      }

      i = j;
    } else {
      // Regular character
      currentSegment.text += input[i];
      i++;
    }
  }

  // Add the last segment if it has text
  if (currentSegment.text.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

type Props = {
  children: string;
};

/**
 * Component that renders text with ANSI escape codes as styled Ink Text components.
 * Parses ANSI color and style codes and applies them as Ink props.
 */
export default memo(function AnsiText({ children }: Props) {
  // If the input is empty or has no ANSI codes, just render it directly
  if (!children || !children.includes('\x1b')) {
    return <Fragment>{children}</Fragment>;
  }

  const segments = parseAnsiString(children);

  // If parsing resulted in a single unstyled segment, render it directly
  if (segments.length === 1 && !segments[0].color && !segments[0].bold && !segments[0].dim && !segments[0].italic && !segments[0].underline && !segments[0].strikethrough && !segments[0].inverse) {
    return <Fragment>{segments[0].text}</Fragment>;
  }

  return (
    <Fragment>
      {segments.map((segment, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Segments have no unique ID, index is stable for parsed content
        <Text key={index} color={segment.color} bold={segment.bold} dimColor={segment.dim} italic={segment.italic} underline={segment.underline} strikethrough={segment.strikethrough} inverse={segment.inverse}>
          {segment.text}
        </Text>
      ))}
    </Fragment>
  );
});
