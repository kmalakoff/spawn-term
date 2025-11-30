# spawn-term Architecture

This document describes the architecture of spawn-term, focusing on how @xterm/headless and Ink work together to provide a terminal UI for running multiple processes.

## Overview

spawn-term renders a terminal UI using [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) while using [@xterm/headless](https://github.com/xtermjs/xterm.js) to properly interpret ANSI escape sequences in process output.

## Key Components

### Session (`src/session.tsx`)

The entry point for the library. Creates an Ink application and manages spawned processes.

```
┌─────────────────────────────────────────────────────────────────┐
│ Session                                                         │
│  ├─ ProcessStore (state management)                             │
│  ├─ Ink App (React rendering)                                   │
│  └─ spawn() → creates TerminalBuffer per process                │
└─────────────────────────────────────────────────────────────────┘
```

### TerminalBuffer (`src/lib/TerminalBuffer.ts`)

Wraps @xterm/headless to provide a virtual terminal buffer per process. This is the key component that makes ANSI interpretation work.

**Why @xterm/headless?**

Process output often contains ANSI escape sequences for:
- Cursor movement (`\x1b[nA`, `\x1b[nB`, etc.)
- Line clearing (`\x1b[2K`, `\x1b[0K`)
- Screen clearing (`\x1b[2J`)
- Carriage returns and rewriting lines

Without proper interpretation, splitting by newlines produces thousands of intermediate states. For example, a progress bar that rewrites the same line produces many "lines" in raw output but should only show the final state.

**How it works:**

```
Raw Output                    TerminalBuffer                  Rendered Output
─────────────────────────────────────────────────────────────────────────────
"Loading...\r"       ───►     terminal.write()      ───►     ["Loading..."]
"Progress: 50%\r"    ───►     terminal.write()      ───►     ["Progress: 50%"]
"Progress: 100%\n"   ───►     terminal.write()      ───►     ["Progress: 100%"]
"Done!\n"            ───►     terminal.write()      ───►     ["Progress: 100%",
                                                              "Done!"]
```

The xterm buffer maintains the actual terminal state, and `getLines()` extracts the rendered content.

### ProcessStore (`src/state/processStore.ts`)

Centralized state management using a subscription pattern compatible with React's `useSyncExternalStore`.

```typescript
// Key methods for terminal buffer integration
getProcessLines(id: string): Line[]      // Extract rendered lines from buffer
getProcessLineCount(id: string): number  // Get count without full extraction
getErrorLines(): { processName, lines }[] // For error footer display
```

### Ink Components (`src/components/`)

React components rendered by Ink:

- **App.tsx** - Main container, keyboard handling, layout
- **CompactProcessLine.ts** - Single-line process status with spinner
- **ExpandedOutput.ts** - Scrollable output view for a process
- **ErrorFooter.ts** - Collapsible error display for non-interactive mode
- **StatusBar.ts** - Running/done/error counts

## Data Flow

### Streaming Data

```
                    ┌────────────────────────────────┐
                    │     Child Process              │
                    │  (stdout/stderr streams)       │
                    └──────────┬─────────────────────┘
                               │ raw chunks
                               ▼
                    ┌────────────────────────────────┐
                    │     TerminalBuffer             │
                    │  (xterm interprets ANSI)       │
                    │  terminal.write(chunk)         │
                    └──────────┬─────────────────────┘
                               │ store.notify()
                               ▼
                    ┌────────────────────────────────┐
                    │     ProcessStore               │
                    │  (notifies React subscribers)  │
                    └──────────┬─────────────────────┘
                               │ re-render trigger
                               ▼
                    ┌────────────────────────────────┐
                    │     Ink Components             │
                    │  store.getProcessLines(id)     │
                    │  → extracts from xterm buffer  │
                    └────────────────────────────────┘
```

### Why Combined stdout/stderr?

Both streams write to the same TerminalBuffer to preserve correct interleaving:

```typescript
if (cp.stdout) {
  cp.stdout.on('data', (chunk) => {
    terminalBuffer.write(chunk);  // Same buffer
    store.notify();
  });
}
if (cp.stderr) {
  cp.stderr.on('data', (chunk) => {
    terminalBuffer.write(chunk);  // Same buffer
    store.notify();
  });
}
```

Error detection uses the process exit code, not stderr presence.

## Render Cycle

1. **Data arrives** - `stdout.on('data')` or `stderr.on('data')`
2. **Write to xterm** - `terminalBuffer.write(chunk)` processes ANSI sequences
3. **Notify store** - `store.notify()` triggers React subscribers
4. **Ink throttles** - Ink limits renders to `maxFps` (default 30)
5. **Extract lines** - `store.getProcessLines(id)` reads from xterm buffer
6. **Render UI** - Ink renders React components to terminal

## Configuration

### Terminal Width

The terminal width is captured at session creation:

```typescript
this.terminalWidth = process.stdout.columns || 80;
```

This is passed to TerminalBuffer so xterm knows how to wrap lines.

### xterm Options

```typescript
new Terminal({
  cols,                    // Terminal width
  rows: 50,                // Visible rows (arbitrary for headless)
  scrollback: 10000,       // Line history buffer
  allowProposedApi: true,  // Required for buffer access
});
```

### Ink Options

```typescript
render(<App store={store} />, {
  incrementalRendering: false,  // Full redraws prevent corruption
  maxFps: 30,                   // Render throttling
});
```

`incrementalRendering: false` is important because content can shift vertically (error footer appearing, scroll position changes) which corrupts incremental updates.

## Cleanup

Terminal buffers are disposed when the session resets:

```typescript
reset(): void {
  for (const process of this.processes) {
    process.terminalBuffer?.dispose();
  }
  // ... reset other state
}
```

## Performance Considerations

1. **xterm.write() is efficient** - Designed for streaming data
2. **getLines() iterates buffer** - Only called during render (throttled to 30fps)
3. **Ink batches updates** - Multiple `notify()` calls coalesce
4. **Scrollback limit** - 10000 lines prevents unbounded memory

## File Summary

| File | Purpose |
|------|---------|
| `src/session.tsx` | Session lifecycle, Ink setup, process spawning |
| `src/lib/TerminalBuffer.ts` | xterm wrapper for ANSI interpretation |
| `src/state/processStore.ts` | Centralized state, line extraction |
| `src/components/App.tsx` | Main UI, keyboard handling |
| `src/types.ts` | TypeScript types including ChildProcess |
