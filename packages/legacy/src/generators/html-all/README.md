# `@doc-kittens/legacy/html/all`

The `legacy-html-all` generator creates a single `all.html` file containing every API documentation module in one page, based on the output from [`legacy-html`](../html/README.md).

Depends on: `@doc-kittens/legacy/html`

## Configuring

| Name           | Type      | Default                      | Description                                    |
| -------------- | --------- | ---------------------------- | ---------------------------------------------- |
| `output`       | `string`  | -                            | The directory where `all.html` will be written |
| `templatePath` | `string`  | Inherited from `legacy-html` | Path to the HTML template file                 |
| `minify`       | `boolean` | Inherited from `global`      | Whether to minify the output HTML              |
| `version`      | `object`  | Inherited from `global`      | Version object containing version information  |
