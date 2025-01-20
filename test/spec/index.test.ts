import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import getLines from '../lib/getLines.cjs';

// @ts-ignore
import spawnTerminal from 'spawn-term';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('index', () => {
  (() => {
    // patch and restore promise
    // @ts-ignore
    let rootPromise: Promise;
    before(() => {
      rootPromise = global.Promise;
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = rootPromise;
    });
  })();

  it('inherit', (done) => {
    spawnTerminal('npm', ['install'], { stdio: 'inherit' }, (err, res) => {
      if (err) return done(err.message);
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('inherit multiple', async () => {
    await Promise.all([spawnTerminal(NODE, ['--version'], { stdio: 'inherit' }), spawnTerminal('npm', ['install'], { stdio: 'inherit' })]);
    // assert.equal(res.stdout, null);
    // assert.equal(res.stderr, null);
  });

  it('encoding utf8', (done) => {
    spawnTerminal(NODE, ['--version'], { encoding: 'utf8' }, {}, (err, res) => {
      if (err) return done(err.message);
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });
});
