# Plan: Integrate @xterm/headless for ANSI Interpretation

## Problem
Currently, process output is split by newlines and stored raw. When output contains ANSI control sequences (cursor movement, line clearing, etc.), we store all intermediate states instead of the final rendered output. This causes 5000+ lines when there should be ~50.

## Solution
Use `@xterm/headless` to maintain a virtual terminal buffer per process. Write raw output to the terminal, then extract the rendered lines from its buffer.

## Architecture

### Current Flow
```
stdout/stderr → addLines (split by \n) → store raw lines → display lines
```

### New Flow
```
stdout/stderr → TerminalBuffer.write() → extract rendered lines → display
```

## Implementation Steps

### Step 1: Install dependency
```bash
npm install @xterm/headless
```

### Step 2: Create TerminalBuffer wrapper (`src/lib/TerminalBuffer.ts`)
```typescript
import { Terminal } from '@xterm/headless';

export class TerminalBuffer {
  private terminal: Terminal;

  constructor(cols = 200, rows = 500) {
    this.terminal = new Terminal({ cols, rows, scrollback: 10000 });
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  getLines(): string[] {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true)); // trimRight=true
      }
    }
    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines;
  }

  dispose(): void {
    this.terminal.dispose();
  }
}
```

### Step 3: Modify ChildProcess type (`src/types.ts`)
Option A: Store terminal buffer reference (lazy line extraction)
```typescript
export type ChildProcess = {
  id: string;
  group?: string;
  title: string;
  state: State;
  lines: Line[];           // Keep for stderr or simple output
  terminalBuffer?: any;    // TerminalBuffer instance for stdout
  expanded?: boolean;
};
```

Option B: Keep lines array, update it from terminal buffer periodically
- Simpler, less invasive change
- Terminal buffer is internal to output handling

**Recommendation: Option B** - Keep the existing `lines` array interface, but populate it from the terminal buffer instead of raw splits.

### Step 4: Create terminal-aware output handler (`src/lib/addTerminalLines.ts`)
```typescript
import { Writable } from 'stream';
import { TerminalBuffer } from './TerminalBuffer.ts';

export type Callback = (lines: string[]) => void;

export default function addTerminalLines(fn: Callback): Writable {
  const buffer = new TerminalBuffer();
  let lastLineCount = 0;

  const stream = new Writable({
    write(chunk, _enc, callback) {
      buffer.write(chunk.toString('utf8'));

      // Get current rendered lines
      const lines = buffer.getLines();

      // Only notify if lines changed
      if (lines.length !== lastLineCount) {
        // Replace all lines (terminal may have modified earlier lines)
        fn(lines);
        lastLineCount = lines.length;
      }

      callback();
    },
  });

  stream.on('finish', () => {
    // Final extraction
    fn(buffer.getLines());
    buffer.dispose();
  });

  return stream;
}
```

### Step 5: Update processStore to support line replacement
Currently `appendLines` only appends. We need a `setLines` method for full replacement:

```typescript
setLines(id: string, newLines: Line[]): void {
  const process = this.processes.find((p) => p.id === id);
  if (process) {
    this.updateProcess(id, { lines: newLines });
  }
}
```

### Step 6: Update session.tsx to use terminal-aware handler
```typescript
// For stdout - use terminal-aware handler
outputs.stdout = addTerminalLines((lines) => {
  this.store.setLines(
    id,
    lines.map((text) => ({ type: LineType.stdout, text }))
  );
});

// For stderr - could use same or keep simple append
// (stderr rarely has cursor control sequences)
```

## Alternative: Hybrid Approach
Keep both stdout and stderr in the same terminal buffer to handle interleaved output correctly:

```typescript
const termBuffer = new TerminalBuffer();

// Both stdout and stderr write to same buffer
if (cp.stdout) {
  cp.stdout.on('data', (chunk) => {
    termBuffer.write(chunk.toString('utf8'));
    updateLines();
  });
}
if (cp.stderr) {
  cp.stderr.on('data', (chunk) => {
    termBuffer.write(chunk.toString('utf8'));
    updateLines();
  });
}

function updateLines() {
  store.setLines(id, termBuffer.getLines().map(text => ({
    type: LineType.stdout, // or detect from content
    text
  })));
}
```

## Considerations

1. **Memory**: Each process has a Terminal instance (~200 cols x 500 rows scrollback). May need to tune based on usage.

2. **Performance**: Terminal parsing has overhead. Batch updates to avoid too frequent re-renders.

3. **Line Type**: With combined terminal buffer, we lose stdout/stderr distinction. Could:
   - Keep separate buffers (current plan)
   - Add ANSI color markers for stderr before writing
   - Just treat all as stdout (simpler)

4. **Terminal Size**: Default 200 cols should handle most output. May want to match actual terminal width.

## Files to Modify
1. `package.json` - add @xterm/headless dependency
2. `src/lib/TerminalBuffer.ts` - new file
3. `src/lib/addTerminalLines.ts` - new file (or modify addLines.ts)
4. `src/state/processStore.ts` - add setLines method
5. `src/session.tsx` - use new terminal-aware handler
6. `src/types.ts` - possibly update if needed

## Testing
1. Run existing tests - should still pass
2. Test with nested spawn-term (the user's use case)
3. Verify line count is dramatically reduced
4. Verify output content is correct (final rendered state)
