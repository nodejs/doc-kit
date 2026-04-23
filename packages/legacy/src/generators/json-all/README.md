# `@doc-kittens/legacy/json/all`

The `legacy-json-all` generator consolidates the output of [`legacy-json`](../json/README.md) into a single `all.json` file containing all API modules.

Depends on: `@doc-kittens/legacy/json`

## Import

```js
import generator from '@doc-kittens/legacy/json/all';
```

## Configuring

| Name     | Type      | Default | Description                                          |
| -------- | --------- | ------- | ---------------------------------------------------- |
| `output` | `string`  | -       | The directory where `all.json` will be written       |
| `minify` | `boolean` | `false` | Whether to minify the output JSON                    |
| `index`  | `array`   | -       | Array of `{ api }` objects defining the module order |
