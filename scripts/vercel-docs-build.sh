#!/usr/bin/env bash

# Build the doc-kit documentation site into `www/out/`.

node scripts/build-docs-content.mjs

node bin/cli.mjs generate \
  --config-file ./www/doc-kit.config.mjs \
  --log-level info
