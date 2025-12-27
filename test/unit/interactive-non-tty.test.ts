import assert from 'assert';
import { createSession } from 'spawn-term';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('session interactive mode with non-TTY', () => {
  if (typeof createSession === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }

  // These tests verify behavior when stdout is NOT a TTY (e.g., CI environments).
  // When stdout IS a TTY, interactive mode legitimately waits for user input.
  if (process.stdout.isTTY) return console.log('Skipping non-TTY tests: stdout is a TTY');

  it('should call waitAndClose callback even when interactive=true and stdout is not a TTY', function (done) {
    this.timeout(5000); // 5 second timeout - should fail fast if bug exists

    // When stdout is not a TTY (like in CI or when piped), inkApp is null.
    // If interactive=true, the session was waiting for user to press 'q' which never happens.
    // This test verifies the fix: waitAndClose should still call its callback.
    const session = createSession({ interactive: true });

    session.spawn(NODE, ['-e', 'console.log("hello")'], { stdio: 'inherit' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);

      // This is where the bug manifests - waitAndClose never calls done()
      // because it waits for user input that will never come
      session.waitAndClose(done);
    });
  });

  it('should call waitAndClose callback for multiple spawns with interactive=true', function (done) {
    this.timeout(5000);

    const session = createSession({ interactive: true });
    let completed = 0;

    const onComplete = () => {
      completed++;
      if (completed === 2) {
        session.waitAndClose(done);
      }
    };

    session.spawn(NODE, ['-e', 'console.log("one")'], { stdio: 'inherit' }, { group: 'Group 1' }, onComplete);
    session.spawn(NODE, ['-e', 'console.log("two")'], { stdio: 'inherit' }, { group: 'Group 2' }, onComplete);
  });

  it('should propagate errors correctly with interactive=true on non-TTY', function (done) {
    this.timeout(5000);

    const session = createSession({ interactive: true });

    session.spawn(NODE, ['-e', 'process.exit(1)'], { stdio: 'inherit' }, {}, (err) => {
      assert.ok(!!err, 'Expected an error for non-zero exit code');
      assert.ok(err.message.includes('Non-zero exit code'), `Expected non-zero exit code error, got: ${err.message}`);
      session.waitAndClose(done);
    });
  });
});
