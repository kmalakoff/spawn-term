import assert from 'assert';
import ansiRegex from '../../src/lib/ansiRegex.ts';

const ansi = ansiRegex();

/**
 * Test to demonstrate and verify the ANSI code stripping fix for color bleed.
 *
 * The Bug:
 * When output like `\x1b[96m[info]\x1b[0m html` is rendered inside Ink's
 * `<Text color="gray">`, Ink transforms `\x1b[0m` (reset ALL) to `\x1b[39m`
 * (reset foreground only). This causes the cyan color to "bleed" because
 * [39m only resets foreground, allowing parent gray to apply.
 *
 * The Fix:
 * Strip ANSI codes from statusText before rendering in colored Text components.
 */
describe('compact line ANSI handling', () => {
  describe('stripAnsi function', () => {
    it('should strip cyan ANSI code from output', () => {
      const output = '\x1b[96m[info]\x1b[0m html generated at ./docs';
      const stripped = output.replace(ansi, '');
      assert.equal(stripped, '[info] html generated at ./docs');
    });

    it('should strip multiple ANSI codes', () => {
      const output = '\x1b[1m\x1b[31merror\x1b[0m normal text\x1b[32m success\x1b[0m';
      const stripped = output.replace(ansi, '');
      assert.equal(stripped, 'error normal text success');
    });

    it('should handle output without ANSI codes', () => {
      const output = 'plain text without ANSI';
      const stripped = output.replace(ansi, '');
      assert.equal(stripped, 'plain text without ANSI');
    });

    it('should handle empty string', () => {
      const output = '';
      const stripped = output.replace(ansi, '');
      assert.equal(stripped, '');
    });
  });

  describe('color bleed scenario', () => {
    /**
     * This test demonstrates the actual color bleed bug.
     *
     * When you render `\x1b[96m[info]\x1b[0m text` inside `<Text color="gray">`:
     * - Input: `\x1b[0m` (reset ALL)
     * - Ink outputs: `\x1b[39m` (reset foreground only)
     * - Result: "text" appears gray (inherited from parent) instead of default
     *
     * The fix ensures we strip ANSI codes so the text renders as plain gray.
     */
    it('should remove ANSI codes that would cause color inheritance', () => {
      // Simulated output from a command like `tsds validate`
      const commandOutput = '\x1b[96m[info]\x1b[0m html generated at ./docs';

      // Before fix: This would be rendered in <Text color="gray"> with raw ANSI
      // which causes cyan to bleed through

      // After fix: We strip ANSI codes before rendering
      const strippedForDisplay = commandOutput.replace(ansi, '');

      // The stripped text is what should be displayed
      assert.equal(strippedForDisplay, '[info] html generated at ./docs');
      assert.ok(!strippedForDisplay.includes('\x1b'), 'No ANSI escape codes should remain');
    });

    it('should handle complex ANSI sequences', () => {
      // Output from commands that use multiple colors/styles
      const commandOutput = '\x1b[32m✓\x1b[0m \x1b[1mBuild completed\x1b[0m in 2s\x1b[96m [info]\x1b[0m done';

      const strippedForDisplay = commandOutput.replace(ansi, '');

      assert.equal(strippedForDisplay, '✓ Build completed in 2s [info] done');
      assert.ok(!strippedForDisplay.includes('\x1b'), 'No ANSI escape codes should remain');
    });
  });
});
