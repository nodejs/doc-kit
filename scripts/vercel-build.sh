set -e

# Use the tag captured during the prepare step as the docs version, so the
# output reflects the nodejs/node release it was generated from (e.g. v26.0.0)
# rather than the Node.js runtime version running this build (process.version).
NODE_VERSION=$(cat .node-tag)

node packages/cli/bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t html \
  -i "./node/doc/api/*.md" \
  --ignore "./node/doc/api/quic.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  -v "$NODE_VERSION" \
  --type-map "./node/doc/type-map.json" \
  --config-file "./beta/doc-kit.config.mjs" \
  --log-level debug

cp ./node/doc/api/*.md "./out"

rm -rf node/
rm -f .node-tag
