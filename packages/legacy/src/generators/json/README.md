# `@doc-kittens/legacy/json`

The `legacy-json` generator creates one legacy JSON file per API module for retro-compatibility with the historical Node.js documentation format.

## Import

```js
import generator from '@doc-kittens/legacy/json';
```

## Configuring

| Name     | Type      | Default  | Description                                      |
| -------- | --------- | -------- | ------------------------------------------------ |
| `output` | `string`  | -        | The directory where JSON files will be written   |
| `ref`    | `string`  | `'main'` | Git reference/branch for linking to source files |
| `minify` | `boolean` | `false`  | Whether to minify the output JSON                |
