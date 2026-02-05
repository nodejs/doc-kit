node bin/cli.mjs generate \
  -t orama-db \
  -t legacy-json \
  -t llms-txt \
  -t web \
  -i "./node/doc/api/*.md" \
  -o "./out" \
  -c "./node/CHANGELOG.md" \
  --index "./node/doc/api/index.md" \
  --log-level debug

cp ./node/doc/api/*.md "./out"

rm -rf node/
