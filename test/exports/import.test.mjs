import assert from 'assert';
import * as spawnTerminalStar from 'spawn-term';
import spawnTerminal, { figures } from 'spawn-term';

const major = +process.versions.node.split('.')[0];

describe('exports .mjs', () => {
  it('named exports', () => {
    assert.equal(typeof spawnTerminal, major > 14 ? 'function' : 'undefined');
    assert.equal(typeof figures, 'object');
  });

  it('default exports', () => {
    assert.equal(typeof spawnTerminalStar.default, major > 14 ? 'function' : 'undefined');
    assert.equal(typeof spawnTerminalStar.figures, 'object');
  });
});
