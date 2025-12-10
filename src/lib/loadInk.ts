import installModule from 'install-module-linked';
import path from 'path';
import url from 'url';

// Get the node_modules directory relative to this file
const _dirname = path.dirname(typeof __dirname !== 'undefined' ? __dirname : url.fileURLToPath(import.meta.url));
const nodeModules = path.join(_dirname, '..', '..', '..', 'node_modules');

let installed = false;
let installing: Promise<void> | null = null;

function installDependency(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // install-module-linked will:
    // 1. Check if module exists locally or in ~/.iml cache
    // 2. If not, install to ~/.iml
    // 3. Create symlink in nodeModules pointing to ~/.iml/package
    installModule(name, nodeModules, {}, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function installInk(): Promise<void> {
  if (installed) return Promise.resolve();
  if (installing) return installing;

  // Install both ink and react - both are needed by session.tsx
  installing = Promise.all([installDependency('ink'), installDependency('react')])
    .then(() => {
      installed = true;
    })
    .catch((err) => {
      installing = null;
      throw err;
    });

  return installing;
}

export function loadInk(callback: (err: Error | null) => void): void {
  installInk()
    .then(() => callback(null))
    .catch((err) => callback(err));
}

export function isInkInstalled(): boolean {
  return installed;
}
