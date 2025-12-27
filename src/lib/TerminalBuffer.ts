import { StreamingTerminal } from 'terminal-model';

/**
 * Wrapper around terminal-model's StreamingTerminal that provides a virtual terminal buffer.
 * Interprets ANSI escape sequences (cursor movement, line clearing, etc.) to produce
 * the actual rendered output rather than raw intermediate states.
 *
 * This implementation preserves whitespace and blank lines by NOT calling trimStart(),
 * which was the bug in the previous xterm-based implementation.
 */
export class TerminalBuffer {
  private terminal: StreamingTerminal;
  private allLines: string[] = [];

  constructor(_cols: number, _scrollback = 10000) {
    // terminal-model doesn't enforce column width during parsing
    // It preserves all content as-is
    this.terminal = new StreamingTerminal();

    // Listen for completed lines (when \n is encountered)
    this.terminal.setLineReadyCallback(() => {
      const line = this.terminal.renderLine();
      this.terminal.reset();
      this.allLines.push(line);
    });
  }

  /**
   * Write raw data to the terminal buffer.
   * The terminal interprets all ANSI sequences automatically.
   */
  write(data: string | Buffer): void {
    this.terminal.write(data);
  }

  /**
   * Resize the terminal width.
   * terminal-model doesn't use column constraints, so this is a no-op for compatibility.
   */
  resize(_cols: number): void {
    // No-op - terminal-model doesn't enforce column width
  }

  /**
   * Extract the rendered lines from the terminal buffer.
   * This returns the actual visible content after all ANSI sequences
   * have been processed, with color codes preserved.
   *
   * CRITICAL: Unlike the xterm implementation, we do NOT call trimStart(),
   * which preserves legitimate indentation and blank lines.
   */
  getLines(): string[] {
    // Flush any pending content (incomplete line without \n)
    if (this.terminal.hasContent()) {
      const line = this.terminal.renderLine();
      this.terminal.reset();
      this.allLines.push(line);
    }

    // Return copy of all lines WITHOUT trimStart() or trimming blank lines
    // Preserves all whitespace, indentation, and blank lines
    return this.allLines.slice();
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
    this.allLines = [];
  }
}
