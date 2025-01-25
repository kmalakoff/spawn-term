const assert = require('assert');
const spawnTerminal = require('spawn-term');

const major = +process.versions.node.split('.')[0];

describe('exports .cjs', () => {
  it('default exports', () => {
    assert.equal(typeof spawnTerminal.default, major > 10 ? 'function' : 'undefined');
    assert.equal(typeof spawnTerminal.figures, 'object');
  });
});
