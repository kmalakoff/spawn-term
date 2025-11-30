import * as xterm from '@xterm/headless';

// Handle both ESM and CJS module formats
const Terminal = (xterm as { Terminal: typeof xterm.Terminal; default?: { Terminal: typeof xterm.Terminal } }).Terminal || (xterm as { default?: { Terminal: typeof xterm.Terminal } }).default?.Terminal;

/**
 * Wrapper around @xterm/headless Terminal that provides a virtual terminal buffer.
 * Interprets ANSI escape sequences (cursor movement, line clearing, etc.) to produce
 * the actual rendered output rather than raw intermediate states.
 */
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
   * have been processed.
   */
  getLines(): string[] {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];

    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        // translateToString(trimRight) - trim trailing whitespace
        // Also trim leading whitespace - tools like ncu/npm use cursor positioning
        // which creates lines with leading spaces when interpreted by xterm
        lines.push(line.translateToString(true).trimStart());
      }
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
