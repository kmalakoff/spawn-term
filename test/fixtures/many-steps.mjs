// Runs N steps through a session on a TTY and prints the peak stdout resize listener count and any warnings as JSON.
import { createSession } from 'spawn-term';

const steps = Number(process.argv[2]);
const warnings = [];
process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));

const session = createSession({ header: 'steps' });
let done = 0;
let peak = 0;
const sample = setInterval(() => {
  peak = Math.max(peak, process.stdout.listenerCount('resize'));
}, 50);

for (let i = 0; i < steps; i++) {
  session.spawn('node', ['-e', 'setTimeout(function () {}, 1500)'], { stdio: 'inherit' }, { group: `step-${i}` }, () => {
    if (++done < steps) return;
    clearInterval(sample);
    session.waitAndClose(() => {
      setTimeout(() => process.stderr.write(`\nRESULT ${JSON.stringify({ peak, warnings })}\n`), 100);
    });
  });
}
