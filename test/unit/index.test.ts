import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import spawnTerminal from 'spawn-term';
import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('index', () => {
  if (typeof spawnTerminal === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }
  (() => {
    // patch and restore promise
    if (typeof global === 'undefined') return;
    const globalPromise = global.Promise;
    before(() => {
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = globalPromise;
    });
  })();

  it.only('inherit', (done) => {
    spawnTerminal('ls', ['-la'], { stdio: 'inherit' }, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('inherit with errors', (done) => {
    spawnTerminal('ls', ['-junk'], { stdio: 'inherit' }, (err) => {
      assert.ok(!!err);
      assert.equal(err.stdout, null);
      assert.equal(err.stderr, null);
      done();
    });
  });

  it('inherit with errors and group', (done) => {
    spawnTerminal('ls', ['-junk'], { stdio: 'inherit' }, { group: 'Group 1' }, (err) => {
      assert.ok(!!err);
      assert.equal(err.stdout, null);
      assert.equal(err.stderr, null);
      done();
    });
  });

  it('inherit with expanded', (done) => {
    spawnTerminal('ls', ['-la'], { stdio: 'inherit' }, { expanded: true }, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('inherit multiple', async () => {
    await Promise.all([spawnTerminal(NODE, ['--version'], { stdio: 'inherit' }, { group: 'Group 1' }), spawnTerminal('ls', ['-la'], { stdio: 'inherit' }, { group: 'Group 2' })]);
  });

  it('encoding utf8', (done) => {
    spawnTerminal(NODE, ['--version'], { encoding: 'utf8' }, {}, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.ok(isVersion(getLines(res.stdout as string).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('encoding utf8 with errors', (done) => {
    spawnTerminal('ls', ['-junk'], { encoding: 'utf8' }, (err) => {
      assert.ok(!!err);
      assert.equal(typeof err.stdout, 'string');
      assert.equal(typeof err.stderr, 'string');
      done();
    });
  });

  it('throws when stdio inherit and encoding are both specified', () => {
    assert.throws(() => {
      spawnTerminal(NODE, ['--version'], { stdio: 'inherit', encoding: 'utf8' }, () => {});
    }, /mutually exclusive/);
  });
});
