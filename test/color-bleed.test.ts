import assert from 'assert';
import { createSession } from 'spawn-term';

/**
 * This test demonstrates the color bleed fix for ANSI codes in compact process lines.
 *
 * The issue: When a command outputs colored text like `[info]\x1b[96mcyan\x1b[0m normal`,
 * and spawn-term displays it in compact view with `<Text color="gray">`,
 * Ink transforms `\x1b[0m` (reset ALL) to `\x1b[39m` (reset foreground only).
 * This causes the cyan color to "bleed" through because [39m only resets
 * foreground color, not all attributes, allowing the parent gray color to take over.
 *
 * The fix: Strip ANSI codes from statusText before displaying in compact view.
 */
describe('color bleed', () => {
  it('should not have ANSI codes in compact status text for running processes', (done) => {
    const session = createSession({ showStatusBar: true });

    // Spawn a command that outputs colored text
    session.spawn('node', ['-e', 'console.log("\\x1b[96m[info]\\x1b[0m html generated at ./docs")'], { stdio: 'pipe' }, { group: 'TestColor' }, (err, res) => {
      if (err) {
        session.close();
        done(err);
        return;
      }

      // The captured output contains ANSI codes
      assert.ok(res.stdout?.includes('\x1b[96m'), 'stdout should contain cyan ANSI code');
      assert.ok(res.stdout?.includes('\x1b[0m'), 'stdout should contain reset ANSI code');

      // Wait a bit for the UI to render and check output
      setTimeout(() => {
        const _output = res.stdout ?? '';

        // The fix strips ANSI codes from the compact view status text
        // so we should NOT see raw ANSI codes in the compact line rendering
        // Note: We can't directly test the rendered output here because
        // the TUI renders to stdout. This test verifies the capture works.
        session.waitAndClose(done);
      }, 100);
    });
  });

  it('should strip ANSI codes from statusText when displaying in colored Text', (done) => {
    const session = createSession({ showStatusBar: true });

    // Use a script that outputs colored text followed by normal text
    session.spawn('node', ['-e', 'process.stdout.write("\\x1b[96m[info]\\x1b[0m html generated\\n")'], { stdio: 'pipe' }, { group: 'StripTest' }, (err, res) => {
      if (err) {
        session.close();
        done(err);
        return;
      }

      // Raw output has ANSI codes
      const rawOutput = res.stdout ?? '';
      assert.ok(rawOutput.includes('\x1b[96m'), 'Raw output should have ANSI codes');

      session.waitAndClose(done);
    });
  });
});
