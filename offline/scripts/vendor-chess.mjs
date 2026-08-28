/**
 * Refresh offline/vendor/chess.js from node_modules.
 *
 * chess.js is vendored rather than imported as a bare specifier because import maps
 * do not apply to Web Workers -- 'chess.js' resolves on the main thread and fails
 * inside the engine worker. A relative import to the vendored file resolves the same
 * way in Node, the main thread and the worker, with no import map and no bundler.
 *
 * Run after bumping the devDependency:  npm --prefix offline run vendor
 */

import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(HERE, '..', 'node_modules', 'chess.js');
const OUT = resolve(HERE, '..', 'vendor', 'chess.js');

const pkg = JSON.parse(await readFile(resolve(PKG_DIR, 'package.json'), 'utf8'));
const source = await readFile(resolve(PKG_DIR, 'dist', 'esm', 'chess.js'), 'utf8');

const header = `/*
 * Vendored dependency: chess.js v${pkg.version} (${pkg.license})
 * Source: https://github.com/jhlywa/chess.js
 *
 * Vendored rather than resolved from node_modules because import maps do NOT apply
 * to Web Workers: a bare 'chess.js' specifier resolves on the main thread and fails
 * inside the engine worker. A relative import to this file resolves identically in
 * Node, the main thread and the worker, with no import map and no bundler.
 *
 * Refresh with: npm --prefix offline run vendor
 * Do not edit by hand. Licence text: vendor/LICENSE.chess.js
 */
`;

await writeFile(OUT, header + source);
await copyFile(resolve(PKG_DIR, 'LICENSE'), resolve(HERE, '..', 'vendor', 'LICENSE.chess.js'));
console.log(`vendored chess.js ${pkg.version} (${pkg.license})`);
