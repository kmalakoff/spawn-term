const assert = require('assert');
const spawnTerminal = require('spawn-term');

const _major = +process.versions.node.split('.')[0];

describe('exports .cjs', () => {
  it('default exports', () => {
    assert.equal(typeof spawnTerminal.default, 'undefined');
    assert.equal(typeof spawnTerminal.figures, 'object');
  });
});
