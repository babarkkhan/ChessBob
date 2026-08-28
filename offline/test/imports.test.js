import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'vendor', '.git']);

async function sourceFiles(dir = ROOT, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await sourceFiles(full, found);
    else if (/\.(js|mjs|html)$/.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * Regression guard for a bug that cost real debugging time and that no Node test
 * would ever have caught.
 *
 * The engine runs in a Web Worker, and **import maps do not apply to workers**. A bare
 * `import { Chess } from 'chess.js'` resolves fine in Node and on the main thread, then
 * fails silently inside the worker -- the board simply sat on "Thinking..." forever.
 *
 * Everything therefore imports the vendored copy by relative path, which resolves
 * identically in Node, the main thread and the worker.
 */
test('nothing imports chess.js by bare specifier', async () => {
  const offenders = [];
  for (const file of await sourceFiles()) {
    // This file necessarily contains the pattern in order to search for it.
    if (file.endsWith('imports.test.js')) continue;
    const text = await readFile(file, 'utf8');
    if (/from\s+['"]chess\.js['"]/.test(text)) offenders.push(relative(ROOT, file));
  }
  assert.deepEqual(
    offenders,
    [],
    'import maps do not apply to Web Workers -- import ../vendor/chess.js by relative path instead'
  );
});

test('the page declares no import map', async () => {
  const html = await readFile(join(ROOT, 'ui', 'index.html'), 'utf8');
  assert.ok(
    !/importmap/.test(html),
    'an import map would work on the main thread but not in the engine worker, which is exactly the trap'
  );
});
