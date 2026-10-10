#!/usr/bin/env bash
set -euo pipefail

# Build the doc-kit documentation site into `www/out/`.

node scripts/build-docs-content.mjs

node packages/cli/bin/cli.mjs generate \
  --config-file ./www/doc-kit.config.mjs \
  --log-level debug
