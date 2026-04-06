# AGENTS.md

## Cursor Cloud specific instructions

This is the Node.js API documentation generator (`@node-core/doc-kit`). It is a single-package Node.js CLI tool (no monorepo, no Docker, no external services).

### Runtime

- Requires **Node.js 24** (see `.nvmrc`). Use `nvm install 24 && nvm use 24` if not already active.
- Package manager is **npm** (lockfile: `package-lock.json`).

### Key commands

All standard dev commands are in `package.json` `scripts` and documented in `CONTRIBUTING.md`:

| Task             | Command                    |
| ---------------- | -------------------------- |
| Install deps     | `npm install`              |
| Lint             | `node --run lint`          |
| Format check     | `node --run format`        |
| Tests            | `node --run test`          |
| Tests + coverage | `node --run test:coverage` |
| Run CLI          | `node bin/cli.mjs`         |

### Running the tool locally

To actually generate docs you need Node.js API markdown sources. Sparse-clone them:

```bash
git clone --depth 1 --sparse https://github.com/nodejs/node.git /tmp/node
cd /tmp/node && git sparse-checkout set --skip-checks doc/api lib CHANGELOG.md
```

Then run against a single file for fast iteration:

```bash
node bin/cli.mjs generate -t legacy-html -i /tmp/node/doc/api/fs.md -o /tmp/out --index /tmp/node/doc/api/index.md -c /tmp/node/CHANGELOG.md
```

### Non-obvious caveats

- The `git sparse-checkout set` command needs `--skip-checks` when including individual files like `CHANGELOG.md` (not directories).
- Pre-commit hook (`npx lint-staged`) runs ESLint + Prettier on staged `.js`/`.mjs`/`.jsx` files. Use `--no-verify` to bypass if needed.
- Tests use Node.js built-in test runner with `--experimental-test-module-mocks` flag (already configured in `package.json` scripts).
- ESLint produces 2 warnings in `src/generators/web/ui/hooks/useOrama.mjs` — these are pre-existing and not errors.
