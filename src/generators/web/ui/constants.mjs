/**
 * @deprecated This is being exported temporarily during the transition period.
 * For a more general solution, category information should be added to pages in
 * YAML format, and this array should be removed.
 *
 * Defines the sidebar navigation groups and their associated page URLs.
 * @type {Array<{ groupName: string, items: Array<string> }>}
 */
export const SIDEBAR_GROUPS = [
  {
    groupName: 'Getting Started',
    items: [
      'documentation.html',
      'synopsis.html',
      'cli.html',
      'environment_variables.html',
      'globals.html',
    ],
  },
  {
    groupName: 'Module System',
    items: [
      'modules.html',
      'esm.html',
      'module.html',
      'packages.html',
      'typescript.html',
    ],
  },
  {
    groupName: 'Networking & Protocols',
    items: [
      'http.html',
      'http2.html',
      'https.html',
      'net.html',
      'dns.html',
      'dgram.html',
      'quic.html',
    ],
  },
  {
    groupName: 'File System & I/O',
    items: [
      'fs.html',
      'path.html',
      'buffer.html',
      'stream.html',
      'string_decoder.html',
      'zlib.html',
      'readline.html',
      'tty.html',
      'zlib_iter.html',
    ],
  },
  {
    groupName: 'Asynchronous Programming',
    items: [
      'async_context.html',
      'async_hooks.html',
      'events.html',
      'timers.html',
      'webstreams.html',
      'stream_iter.html',
    ],
  },
  {
    groupName: 'Process & Concurrency',
    items: [
      'process.html',
      'child_process.html',
      'cluster.html',
      'worker_threads.html',
      'os.html',
    ],
  },
  {
    groupName: 'Security & Cryptography',
    items: ['crypto.html', 'webcrypto.html', 'permissions.html', 'tls.html'],
  },
  {
    groupName: 'Data & URL Utilities',
    items: ['url.html', 'querystring.html', 'punycode.html', 'util.html'],
  },
  {
    groupName: 'Debugging & Diagnostics',
    items: [
      'debugger.html',
      'inspector.html',
      'console.html',
      'report.html',
      'tracing.html',
      'diagnostics_channel.html',
      'errors.html',
    ],
  },
  {
    groupName: 'Testing & Assertion',
    items: ['test.html', 'assert.html', 'repl.html'],
  },
  {
    groupName: 'Performance & Observability',
    items: ['perf_hooks.html', 'v8.html'],
  },
  {
    groupName: 'Runtime & Advanced APIs',
    items: [
      'vm.html',
      'wasi.html',
      'sqlite.html',
      'single-executable-applications.html',
      'intl.html',
    ],
  },
  {
    groupName: 'Native & Low-level Extensions',
    items: ['addons.html', 'n-api.html', 'embedding.html'],
  },
  {
    groupName: 'Legacy & Deprecated',
    items: ['deprecations.html', 'domain.html'],
  },
];
