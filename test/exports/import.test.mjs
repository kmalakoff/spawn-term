import assert from 'assert';
import spawnTerminal from 'spawn-term';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof spawnTerminal, 'function');
  });
});
