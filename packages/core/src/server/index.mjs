'use strict';

import { createReadStream, existsSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

import globParent from 'glob-parent';

/**
 * Content types for the file extensions a generator is expected to emit.
 * Anything else is served as a generic binary stream.
 */
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Returns the `Content-Type` for a file based on its extension.
 *
 * @param {string} file - The file path
 * @returns {string}
 */
export const getContentType = file =>
  CONTENT_TYPES[extname(file)] ?? 'application/octet-stream';

/**
 * Resolves a request URL to a file inside the output directory, or `null`
 * when nothing matches. Directory requests fall back to their `index.html`,
 * and extension-less requests to `<path>.html` — mirroring how generated
 * pages link to each other.
 *
 * Paths resolving outside the root (e.g. `..` traversal) are rejected.
 *
 * @param {string} root - The directory being served
 * @param {string} url - The request URL (path and optional query string)
 * @returns {string | null} The file to serve, or `null` if none matches
 */
export const resolveStaticPath = (root, url) => {
  const base = resolve(root);

  /** @type {string} */
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }

  const requested = resolve(base, `.${pathname}`);

  if (requested !== base && !requested.startsWith(base + sep)) {
    return null;
  }

  const candidates = [
    requested,
    join(requested, 'index.html'),
    `${requested}.html`,
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
};

/**
 * Creates an HTTP server that serves static files from a directory.
 *
 * @param {string} root - The directory to serve
 * @returns {import('node:http').Server}
 */
export const createStaticServer = root =>
  createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }

    const file = resolveStaticPath(root, request.url);

    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': getContentType(file) });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
  });

/**
 * Starts listening on the preferred port, walking up to the next port when
 * the current one is taken.
 *
 * @param {import('node:http').Server} server - The server to bind
 * @param {number} preferred - The preferred port
 * @param {number} [attempts=10] - How many consecutive ports to try
 * @returns {Promise<number>} The port the server is listening on
 */
export const listenOnAvailablePort = async (
  server,
  preferred,
  attempts = 10
) => {
  for (let port = preferred; port < preferred + attempts; port++) {
    try {
      return await new Promise((onListening, onError) => {
        server.once('error', onError);
        server.listen(port, () => {
          server.off('error', onError);
          // `server.address().port` also resolves port 0 (OS-assigned)
          onListening(server.address().port);
        });
      });
    } catch (error) {
      if (error.code !== 'EADDRINUSE') {
        throw error;
      }
    }
  }

  throw new Error(
    `No available port between ${preferred} and ${preferred + attempts - 1}. ` +
      'Pass `--port` to pick a different range.'
  );
};

/**
 * Wraps a rebuild function so bursts of file-system events coalesce into a
 * single run: events within `delay` are debounced, and events arriving while
 * a rebuild is in flight schedule exactly one follow-up run.
 *
 * @param {() => Promise<void>} rebuild - The rebuild to run
 * @param {number} [delay=300] - Debounce window in milliseconds
 * @returns {() => void} The change handler to pass to a watcher
 */
export const createRebuildScheduler = (rebuild, delay = 300) => {
  let timer;
  let running = false;
  let pending = false;

  /**
   * Runs the rebuild, folding events that arrive mid-run into one follow-up.
   */
  const run = async () => {
    if (running) {
      pending = true;
      return;
    }

    running = true;

    try {
      await rebuild();
    } finally {
      running = false;

      if (pending) {
        pending = false;
        run();
      }
    }
  };

  return () => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };
};

/**
 * Watches the directories containing the given glob patterns.
 *
 * @param {string[]} patterns - Input file patterns (glob)
 * @param {() => void} onChange - Invoked on every file-system event
 * @returns {{ dirs: string[], close: () => void }} The watched directories
 * and a disposer
 */
export const watchPaths = (patterns, onChange) => {
  const dirs = [
    ...new Set(patterns.map(pattern => globParent(pattern))),
  ].filter(dir => existsSync(dir));

  const watchers = dirs.map(dir => watch(dir, { recursive: true }, onChange));

  /**
   * Stops all file-system watchers.
   */
  const close = () => watchers.forEach(watcher => watcher.close());

  return { dirs, close };
};
