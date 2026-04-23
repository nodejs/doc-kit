node packages/core/bin/cli.mjs generate \
  -t @doc-kittens/react/orama-db \
  -t @doc-kittens/legacy/json \
  -t @doc-kittens/website/llms-txt \
  -t @doc-kittens/react/web \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  --index "./node/doc/api/index.md" \
  --log-level debug

cp ./node/doc/api/*.md "./out"

# rm -rf node/
