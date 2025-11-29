import assert from 'assert';

import * as spawnTermStar from 'spawn-term';
import { createSession, figures } from 'spawn-term';

const major = +process.versions.node.split('.')[0];

describe('exports .js', () => {
  it('named exports', () => {
    assert.equal(typeof createSession, major > 18 ? 'function' : 'undefined');
    assert.equal(typeof figures, 'object');
  });

  it('star exports', () => {
    assert.equal(typeof spawnTermStar.createSession, major > 18 ? 'function' : 'undefined');
    assert.equal(typeof spawnTermStar.figures, 'object');
  });
});
