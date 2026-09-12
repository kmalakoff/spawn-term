# spawn-term

Runs child processes in a terminal-oriented session with grouping, status, and formatted output.

```bash
npm install spawn-term
```

```typescript
import { createSession } from 'spawn-term';

const session = createSession({ header: 'Project checks' });
session.spawn('npm', ['test'], { stdio: 'inherit' }, { group: 'tests' }, (err) => {
  if (err) console.error(err);
});
session.waitAndClose(() => console.log('done'));
```

The public API is named: `createSession` creates a session, `session.spawn` starts a process, and `waitAndClose` waits for active processes before cleaning up. Process options include `group` and `expanded`; session options include `header`, `showStatusBar`, and `interactive`.

The ESM build provides `createSession` on Node.js 19 and newer; the CommonJS entry point and older Node.js versions expose only formatting helpers. On first use, `createSession` may download Ink into the `install-module-linked` cache and link it into the package, so it needs network access and a writable cache when Ink is not already available.
