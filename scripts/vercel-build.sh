node bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t web \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  --index "./node/doc/api/index.md"

rm -rf node/
