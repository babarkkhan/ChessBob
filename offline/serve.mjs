/**
 * Static server for the offline board.
 *
 * Development: `node offline/serve.mjs`, then open http://127.0.0.1:8137/offline/
 * Device: the supervisor runs this and points the content browser at the same URL,
 * with Chromium managed policy allowlisting loopback only
 * (packaging/chromium/policies/offline.json).
 *
 * Binds to loopback only. Nothing served here should ever be reachable from the
 * network -- see docs/threat-model.md.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CHESSBOB_OFFLINE_PORT ?? 8137);
const HOST = '127.0.0.1';

const UI_ROOT = resolve(HERE, 'ui');
const ENGINE_ROOT = resolve(HERE, 'engine');

const VENDOR_ROOT = resolve(HERE, 'vendor');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

/**
 * Resolve a request path inside a root, refusing anything that escapes it.
 * Resolving and then checking the prefix is the reliable form of this check --
 * stripping "../" with a regex misses encodings and is easy to get subtly wrong.
 *
 * @returns {string|null} absolute path, or null if it escapes the root
 */
function safeJoin(root, relative) {
  const target = resolve(root, '.' + (relative.startsWith('/') ? relative : '/' + relative));
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}

function resolveRequest(pathname) {
  if (pathname === '/' || pathname === '/offline' || pathname === '/offline/') {
    return join(UI_ROOT, 'index.html');
  }
  if (pathname.startsWith('/vendor/')) {
    return safeJoin(VENDOR_ROOT, pathname.slice('/vendor'.length));
  }
  if (pathname.startsWith('/offline/')) {
    return safeJoin(UI_ROOT, pathname.slice('/offline'.length));
  }
  // The worker imports ../engine/index.js, so that tree is served too.
  if (pathname.startsWith('/engine/')) {
    return safeJoin(ENGINE_ROOT, pathname.slice('/engine'.length));
  }
  return null;
}

const server = createServer(async (req, res) => {
  let file = null;
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    file = resolveRequest(decodeURIComponent(url.pathname));
  } catch {
    file = null;
  }

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`ChessBob offline board: http://${HOST}:${PORT}/offline/`);
});
