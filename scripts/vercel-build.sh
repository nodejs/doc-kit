node bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t web \
  -t web-all \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  --type-map "./node/doc/type-map.json" \
  --index "./node/doc/api/index.md" \
  --log-level debug

cp ./node/doc/api/*.md "./out"

rm -rf node/
