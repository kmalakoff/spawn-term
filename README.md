## spawn-term

Formats spawn with prefix and colors

```
import spawn from 'spawn-term'

await spawn('npm', ['install'], { stdio: 'inherit' });
await spawn('npm', ['test'], { stdio: 'inherit' });

```

## Testing

Some tests verify behavior specific to non-TTY environments (e.g., CI pipelines). These tests are skipped when stdout is a TTY.

To run all tests including non-TTY tests locally, pipe the output:

```bash
npm test 2>&1 | cat
```
