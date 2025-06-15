import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import getLines from '../lib/getLines.cjs';

// @ts-ignore
import spawnTerminal from 'spawn-term';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const _major = +process.versions.node.split('.')[0];

describe('index', () => {
  if (typeof spawnTerminal === 'undefined') {
    return console.log(`Not available in ${process.versions.node}`);
  }
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
    // assert.equal(res.stdout, null);
    // assert.equal(res.stderr, null);
  });

  it('encoding utf8', (done) => {
    spawnTerminal(NODE, ['--version'], { encoding: 'utf8' }, {}, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
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
});
