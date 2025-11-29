import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import { createSession } from 'spawn-term';
import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('session', () => {
  if (typeof createSession === 'undefined') {
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

  it('inherit', (done) => {
    const session = createSession();
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      session.waitAndClose(done);
    });
  });

  it('inherit with errors', (done) => {
    const session = createSession();
    session.spawn('ls', ['-junk'], { stdio: 'inherit' }, {}, (err) => {
      assert.ok(!!err);
      assert.equal(err.stdout, null);
      assert.equal(err.stderr, null);
      session.waitAndClose(done);
    });
  });

  it('inherit with errors and group', (done) => {
    const session = createSession();
    session.spawn('ls', ['-junk'], { stdio: 'inherit' }, { group: 'Group 1' }, (err) => {
      assert.ok(!!err);
      assert.equal(err.stdout, null);
      assert.equal(err.stderr, null);
      session.waitAndClose(done);
    });
  });

  it('inherit with expanded', (done) => {
    const session = createSession();
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, { expanded: true }, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      session.waitAndClose(done);
    });
  });

  it('inherit multiple', (done) => {
    const session = createSession();
    let completed = 0;
    const onComplete = () => {
      completed++;
      if (completed === 2) {
        session.waitAndClose(done);
      }
    };
    session.spawn(NODE, ['--version'], { stdio: 'inherit' }, { group: 'Group 1' }, onComplete);
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, { group: 'Group 2' }, onComplete);
  });

  it('inherit with header and status bar', (done) => {
    const session = createSession({ header: 'Test Header', showStatusBar: true });
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      session.waitAndClose(done);
    });
  });

  it('inherit multiple with header', (done) => {
    const session = createSession({ header: 'Multi Header', showStatusBar: true });
    let completed = 0;
    const onComplete = () => {
      completed++;
      if (completed === 2) {
        session.waitAndClose(done);
      }
    };
    session.spawn(NODE, ['--version'], { stdio: 'inherit' }, { group: 'Group 1' }, onComplete);
    session.spawn('ls', ['-la'], { stdio: 'inherit' }, { group: 'Group 2' }, onComplete);
  });

  it('encoding utf8', (done) => {
    const session = createSession();
    session.spawn(NODE, ['--version'], { encoding: 'utf8' }, {}, (err, res) => {
      if (err) {
        session.close();
        done(err.message);
        return;
      }
      assert.ok(isVersion(getLines(res.stdout as string).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      session.waitAndClose(done);
    });
  });

  it('encoding utf8 with errors', (done) => {
    const session = createSession();
    session.spawn('ls', ['-junk'], { encoding: 'utf8' }, {}, (err) => {
      assert.ok(!!err);
      assert.equal(typeof err.stdout, 'string');
      assert.equal(typeof err.stderr, 'string');
      session.waitAndClose(done);
    });
  });
});
