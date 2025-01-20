import assert from 'assert';

// @ts-ignore
import spawnTerminal from 'spawn-term';

describe('exports .ts', () => {
  it('defaults', () => {
    assert.equal(typeof spawnTerminal, 'function');
  });
});
