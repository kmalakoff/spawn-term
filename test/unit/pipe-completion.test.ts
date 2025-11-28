import assert from 'assert';
import path from 'path';
import spawnTerminal from 'spawn-term';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

describe('pipe completion with sustained output', () => {
  if (typeof spawnTerminal === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }
  const MAX_DURATION = 10000;
  const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sustained-output.js');

  it('stdio=inherit pipes should complete without hanging', function (done) {
    this.timeout(MAX_DURATION);
    const startTime = Date.now();

    spawnTerminal('node', [FIXTURE], { stdio: 'inherit' }, (err, res) => {
      const duration = Date.now() - startTime;

      if (err) {
        done(new Error(`Process failed: ${err.message}`));
        return;
      }

      assert.ok(duration < 5000, `Process took too long (${duration}ms)`);
      assert.ok(res);
      done();
    });
  });

  it('encoding pipes should receive complete output', (done) => {
    spawnTerminal('node', [FIXTURE], { encoding: 'utf8' }, (err, res) => {
      if (err) return done(err);

      assert.ok(res.stdout);
      assert.ok(res.stdout.includes('✓ 50 tests completed'), 'Should receive complete output');
      assert.ok(res.stdout.includes('test 1'), 'Should receive beginning of output');
      assert.ok(res.stdout.includes('test 50'), 'Should receive end of output');

      done();
    });
  });
});
