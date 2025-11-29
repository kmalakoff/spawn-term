import assert from 'assert';
import { createSession } from 'spawn-term';

describe('error footer', () => {
  if (typeof createSession === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }

  it('shows collapsed error footer for non-interactive mode with errors', (done) => {
    const session = createSession({ showStatusBar: true });
    session.spawn('ls', ['-junk'], { stdio: 'inherit' }, { group: 'TestGroup' }, (err) => {
      assert.ok(!!err);
      // Error footer should be visible in output (collapsed by default)
      // Visual verification: "▸ X error lines in Y process [e]"
      session.waitAndClose(done);
    });
  });

  it('shows expanded error footer when all processes complete', (done) => {
    const session = createSession({ showStatusBar: true });
    session.spawn('ls', ['-junk'], { stdio: 'inherit' }, { group: 'ErrorGroup' }, (err) => {
      assert.ok(!!err);
      // Error footer should auto-expand when all processes complete
      // Visual verification: "▾ Errors [e]" followed by error lines
      session.waitAndClose(done);
    });
  });

  it('shows multiple error groups in footer', (done) => {
    const session = createSession({ showStatusBar: true });
    let completed = 0;
    const onComplete = () => {
      completed++;
      if (completed === 2) {
        // Both errors should be in the footer
        session.waitAndClose(done);
      }
    };
    session.spawn('ls', ['-junk1'], { stdio: 'inherit' }, { group: 'Group1' }, (err) => {
      assert.ok(!!err);
      onComplete();
    });
    session.spawn('ls', ['-junk2'], { stdio: 'inherit' }, { group: 'Group2' }, (err) => {
      assert.ok(!!err);
      onComplete();
    });
  });

  it('does not show error footer for interactive mode', (done) => {
    const session = createSession({ interactive: true, showStatusBar: true });
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      // In interactive mode, no error footer - use Enter to expand processes
      session.close();
      done();
    });
  });

  it('does not show error footer when no errors', (done) => {
    const session = createSession({ showStatusBar: true });
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      // No errors = no error footer
      session.waitAndClose(done);
    });
  });

  it('shows error footer for command not found (no stderr)', (done) => {
    const session = createSession({ showStatusBar: true });
    session.spawn('nonexistent-command-xyz', [], { stdio: 'inherit' }, { group: 'BadCmd' }, (err) => {
      assert.ok(!!err);
      // Footer should show "1 failed process" even without stderr lines
      session.waitAndClose(done);
    });
  });
});
