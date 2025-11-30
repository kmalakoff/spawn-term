import * as xterm from '@xterm/headless';

// Handle both ESM and CJS module formats
const Terminal = (xterm as { Terminal: typeof xterm.Terminal; default?: { Terminal: typeof xterm.Terminal } }).Terminal || (xterm as { default?: { Terminal: typeof xterm.Terminal } }).default?.Terminal;

// ANSI color mode constants from xterm.js
const COLOR_MODE_DEFAULT = 0;
const COLOR_MODE_16 = 16777216; // 0x1000000 - 16 color palette (0-15)
const COLOR_MODE_256 = 33554432; // 0x2000000 - 256 color palette
const COLOR_MODE_RGB = 50331648; // 0x3000000 - 24-bit RGB

/**
 * Wrapper around @xterm/headless Terminal that provides a virtual terminal buffer.
 * Interprets ANSI escape sequences (cursor movement, line clearing, etc.) to produce
 * the actual rendered output rather than raw intermediate states.
 */
// Cell attribute state for tracking changes
interface CellStyle {
  fg: number;
  fgMode: number;
  bg: number;
  bgMode: number;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  inverse: boolean;
  strikethrough: boolean;
}

const DEFAULT_STYLE: CellStyle = {
  fg: -1,
  fgMode: COLOR_MODE_DEFAULT,
  bg: -1,
  bgMode: COLOR_MODE_DEFAULT,
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  inverse: false,
  strikethrough: false,
};

function styleEquals(a: CellStyle, b: CellStyle): boolean {
  return a.fg === b.fg && a.fgMode === b.fgMode && a.bg === b.bg && a.bgMode === b.bgMode && a.bold === b.bold && a.dim === b.dim && a.italic === b.italic && a.underline === b.underline && a.inverse === b.inverse && a.strikethrough === b.strikethrough;
}

function buildAnsiCode(style: CellStyle): string {
  const codes: number[] = [];

  // Attributes
  if (style.bold) codes.push(1);
  if (style.dim) codes.push(2);
  if (style.italic) codes.push(3);
  if (style.underline) codes.push(4);
  if (style.inverse) codes.push(7);
  if (style.strikethrough) codes.push(9);

  // Foreground color
  if (style.fgMode === COLOR_MODE_16) {
    // 16-color palette: 0-7 are 30-37, 8-15 are 90-97
    if (style.fg < 8) {
      codes.push(30 + style.fg);
    } else {
      codes.push(90 + (style.fg - 8));
    }
  } else if (style.fgMode === COLOR_MODE_256) {
    codes.push(38, 5, style.fg);
  } else if (style.fgMode === COLOR_MODE_RGB) {
    // RGB is encoded in the color value
    const r = (style.fg >> 16) & 0xff;
    const g = (style.fg >> 8) & 0xff;
    const b = style.fg & 0xff;
    codes.push(38, 2, r, g, b);
  }

  // Background color
  if (style.bgMode === COLOR_MODE_16) {
    if (style.bg < 8) {
      codes.push(40 + style.bg);
    } else {
      codes.push(100 + (style.bg - 8));
    }
  } else if (style.bgMode === COLOR_MODE_256) {
    codes.push(48, 5, style.bg);
  } else if (style.bgMode === COLOR_MODE_RGB) {
    const r = (style.bg >> 16) & 0xff;
    const g = (style.bg >> 8) & 0xff;
    const b = style.bg & 0xff;
    codes.push(48, 2, r, g, b);
  }

  if (codes.length === 0) return '';
  return `\x1b[${codes.join(';')}m`;
}

export class TerminalBuffer {
  private terminal: InstanceType<typeof Terminal>;

  constructor(cols: number, scrollback = 10000) {
    this.terminal = new Terminal({
      cols,
      rows: 50, // Visible rows (doesn't matter much for headless)
      scrollback,
      allowProposedApi: true,
    });
  }

  /**
   * Write raw data to the terminal buffer.
   * The terminal interprets all ANSI sequences automatically.
   */
  write(data: string | Buffer): void {
    const str = typeof data === 'string' ? data : data.toString('utf8');
    this.terminal.write(str);
  }

  /**
   * Resize the terminal width.
   */
  resize(cols: number): void {
    this.terminal.resize(cols, this.terminal.rows);
  }

  /**
   * Extract the rendered lines from the terminal buffer.
   * This returns the actual visible content after all ANSI sequences
   * have been processed, with color codes preserved.
   */
  getLines(): string[] {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];

    for (let i = 0; i < buffer.length; i++) {
      const bufferLine = buffer.getLine(i);
      if (!bufferLine) continue;

      let result = '';
      let currentStyle: CellStyle = { ...DEFAULT_STYLE };
      let _hasContent = false;

      // First pass: find the last non-empty cell to know where content ends
      let lastContentIndex = -1;
      for (let j = bufferLine.length - 1; j >= 0; j--) {
        const cell = bufferLine.getCell(j);
        if (cell && cell.getChars()) {
          lastContentIndex = j;
          break;
        }
      }

      // Second pass: build the line with ANSI codes
      for (let j = 0; j <= lastContentIndex; j++) {
        const cell = bufferLine.getCell(j);
        if (!cell) continue;

        const char = cell.getChars();
        const cellStyle: CellStyle = {
          fg: cell.getFgColor(),
          fgMode: cell.getFgColorMode(),
          bg: cell.getBgColor(),
          bgMode: cell.getBgColorMode(),
          bold: cell.isBold() !== 0,
          dim: cell.isDim() !== 0,
          italic: cell.isItalic() !== 0,
          underline: cell.isUnderline() !== 0,
          inverse: cell.isInverse() !== 0,
          strikethrough: cell.isStrikethrough() !== 0,
        };

        // Check if style changed
        if (!styleEquals(cellStyle, currentStyle)) {
          // Reset if going back to default, otherwise emit new style
          if (styleEquals(cellStyle, DEFAULT_STYLE)) {
            result += '\x1b[0m';
          } else {
            // If we had styling before, reset first for clean transition
            if (!styleEquals(currentStyle, DEFAULT_STYLE)) {
              result += '\x1b[0m';
            }
            result += buildAnsiCode(cellStyle);
          }
          currentStyle = cellStyle;
        }

        result += char || ' ';
        if (char) _hasContent = true;
      }

      // Reset at end of line if we had styling
      if (!styleEquals(currentStyle, DEFAULT_STYLE)) {
        result += '\x1b[0m';
      }

      // Trim leading whitespace - tools like ncu/npm use cursor positioning
      // which creates lines with leading spaces when interpreted by xterm
      lines.push(result.trimStart());
    }

    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    return lines;
  }

  /**
   * Get the number of rendered lines.
   */
  get lineCount(): number {
    return this.getLines().length;
  }

  /**
   * Clean up terminal resources.
   */
  dispose(): void {
    this.terminal.dispose();
  }
}
