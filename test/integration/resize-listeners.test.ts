import assert from 'assert';
import { spawnSync } from 'child_process';
import path from 'path';
import { createSession } from 'spawn-term';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'many-steps.mjs');
const STEPS = 12;

// script(1) gives the fixture a real TTY; the pty needs nonzero rows or Ink renders one step row.
// BSD/macOS script requires its own stdin to be a terminal, so a run without one returns null and skips.
function runOnPty(steps: number): { peak: number; warnings: string[] } | null {
  const command = `stty rows 40 cols 120; exec node ${FIXTURE} ${steps}`;
  const args = process.platform === 'linux' ? ['-qec', `sh -c '${command}'`, '/dev/null'] : ['-q', '/dev/null', 'sh', '-c', command];
  const res = spawnSync('script', args, { encoding: 'utf8', timeout: 30000, stdio: ['inherit', 'pipe', 'pipe'] });
  const match = /RESULT (\{.*\})/.exec(`${res.stdout}${res.stderr}`);
  return match ? JSON.parse(match[1]) : null;
}

describe('resize listeners on a TTY', () => {
  if (typeof createSession === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }
  if (process.platform === 'win32') return console.log('Skipping: needs a pseudo-terminal from script(1)');

  it('keeps one resize listener on stdout however many steps run', function () {
    this.timeout(40000);
    const result = runOnPty(STEPS);
    if (!result) return this.skip();
    assert.deepEqual(result.warnings, []);
    assert.ok(result.peak <= 2, `peak resize listeners ${result.peak}`);
  });
});
