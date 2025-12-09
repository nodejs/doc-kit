node bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t web \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  --index "./node/doc/api/index.md" \
  --type-map "./node/doc/type-map.json" \
  --log-level debug

rm -rf node/
