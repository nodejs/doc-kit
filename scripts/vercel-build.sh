node packages/core/bin/cli.mjs generate \
  -t @node-core/doc-kit/generators/orama-db \
  -t @node-core/doc-kit/generators/legacy-json \
  -t @node-core/doc-kit/generators/llms-txt \
  -t @node-core/doc-kit/generators/web \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  --index "./node/doc/api/index.md" \
  --log-level debug

cp ./node/doc/api/*.md "./out"

rm -rf node/
