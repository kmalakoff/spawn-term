import assert from 'assert';

// @ts-ignore
import * as spawnTerminalStar from 'spawn-term';
// @ts-ignore
import spawnTerminal, { figures } from 'spawn-term';

const major = +process.versions.node.split('.')[0];

describe('exports .ts', () => {
  it('named exports', () => {
    assert.equal(typeof spawnTerminal, major > 10 ? 'function' : 'undefined');
    assert.equal(typeof figures, 'object');
  });

  it('default exports', () => {
    assert.equal(typeof spawnTerminalStar.default, major > 10 ? 'function' : 'undefined');
    assert.equal(typeof spawnTerminalStar.figures, 'object');
  });
});
