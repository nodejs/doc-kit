#!/usr/bin/env bash
set -euo pipefail

readonly NODE_REPO="https://github.com/nodejs/node.git"
readonly SRC_DIR="node"
readonly OUT_DIR="out"

cleanup() { rm -rf "$SRC_DIR"; }
trap cleanup EXIT

tags=$(git ls-remote --tags --refs --sort='-v:refname' "$NODE_REPO" 'v*')
LATEST_TAG=$(awk -F/ '$NF !~ /-/ { print $NF; exit }' <<<"$tags")

if [[ -z $LATEST_TAG ]]; then
  echo "Could not determine the latest nodejs/node release tag" >&2
  exit 1
fi

echo "Building docs for nodejs/node $LATEST_TAG"

clone_node_docs() {
  rm -rf "$SRC_DIR"
  git clone --depth 1 --no-tags --branch "$LATEST_TAG" \
    --filter=blob:none --sparse "$NODE_REPO" "$SRC_DIR"
  git -C "$SRC_DIR" sparse-checkout set doc lib
}

clone_node_docs &
clone_pid=$!

pnpm install --frozen-lockfile

wait "$clone_pid"

mkdir -p "$OUT_DIR"

node packages/cli/bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t html \
  -i "./$SRC_DIR/doc/api/*.md" \
  --ignore "./$SRC_DIR/doc/api/quic.md" \
  -o "./$OUT_DIR" \
  -c "./$SRC_DIR/CHANGELOG.md" \
  -v "$LATEST_TAG" \
  --type-map "./$SRC_DIR/doc/type-map.json" \
  --index "./$SRC_DIR/doc/api/index.md" \
  --config-file "./beta/doc-kit.config.mjs" \
  --log-level debug

cp "$SRC_DIR"/doc/api/*.md "$OUT_DIR/"