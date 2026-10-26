import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

/**
 * Sends a file over the response, if present
 *
 * @param {import('node:http').ServerResponse} response - The response to write to
 * @param {string} filePath - The file to send
 * @param {number} status - The status code to send it with
 */
const sendFile = (response, filePath, status) => {
  const stream = createReadStream(filePath);

  stream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(500);
    }

    response.end();
  });

  response.writeHead(status, {
    'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
  });

  stream.pipe(response);
};

/**
 * Creates an HTTP server that serves static files from a directory. Directories
 * resolve to their `index.html`; missing paths fall back to a `404.html` at the
 * root of the directory, if one exists.
 *
 * @param {string} directory - The directory to serve files from
 * @returns {import('node:http').Server}
 */
export const createStaticServer = directory => {
  const root = resolve(directory);

  return createServer(async (request, response) => {
    let pathname;

    try {
      pathname = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname
      );
    } catch {
      response.writeHead(400);
      response.end('Bad Request');

      return;
    }

    const filePath = resolve(root, `.${pathname}`);

    // Requests must not escape the served directory
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403);
      response.end('Forbidden');

      return;
    }

    let file = filePath;
    const stats = await stat(file).catch(() => null);

    if (stats?.isDirectory()) {
      file = resolve(file, 'index.html');
    }

    if (stats?.isFile() || (await stat(file).catch(() => null))?.isFile()) {
      sendFile(response, file, 200);

      return;
    }

    const notFound = resolve(root, '404.html');

    if ((await stat(notFound).catch(() => null))?.isFile()) {
      sendFile(response, notFound, 404);

      return;
    }

    response.writeHead(404);
    response.end('Not Found');
  });
};

/**
 * Serves a directory over HTTP. This is a minimal server for local testing
 * and previewing only — it is not production grade.
 *
 * @param {string} directory - The directory to serve files from
 * @param {Object} [options] - Serving options
 * @param {string} [options.host='localhost'] - The host to listen on
 * @param {number} [options.port=3000] - The port to listen on (`0` picks a free one)
 * @returns {Promise<import('node:http').Server>} The listening server
 */
export const serve = (directory, { host = 'localhost', port = 3000 } = {}) =>
  new Promise((resolvePromise, reject) => {
    const server = createStaticServer(directory);

    server.on('error', reject);
    server.listen(port, host, () => resolvePromise(server));
  });
