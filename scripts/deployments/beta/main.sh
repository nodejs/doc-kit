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

# TODO(@avivkeller): Remove this rewrite once nodejs/node embeds
# `<DocumentationIndex />` directly.
readonly API_DIR="$SRC_DIR/doc/api"
INTRODUCED_IN=$(sed -n 's/^<!--introduced_in=\(.*\)-->$/\1/p' "$API_DIR/documentation.md")

{
  printf -- '---\nmdx: true\ntype: misc\n'
  if [[ -n $INTRODUCED_IN ]]; then
    printf -- 'introduced_in: %s\n' "$INTRODUCED_IN"
  fi
  printf -- '---\n'
  sed \
    -e 's|<!-- STABILITY_OVERVIEW_SLOT_BEGIN -->|<DocumentationIndex />|' \
    -e '/^<!--.*-->$/d' \
    -e '/^<!-- YAML$/,/^-->$/d' \
    "$API_DIR/documentation.md"
} >"$API_DIR/index.md"

rm "$API_DIR/documentation.md"

mkdir -p "$OUT_DIR"

node packages/cli/bin/cli.mjs generate \
  -t orama-db \
  -t json \
  -t llms-txt \
  -t section-pages \
  -i "./$API_DIR/*.md" \
  --ignore "./$API_DIR/quic.md" \
  -o "./$OUT_DIR" \
  -c "./$SRC_DIR/CHANGELOG.md" \
  -v "$LATEST_TAG" \
  --type-map "./$SRC_DIR/doc/type-map.json" \
  --config-file "./beta/doc-kit.config.mjs" \
  --log-level debug

cp "$API_DIR"/*.md "$OUT_DIR/"
