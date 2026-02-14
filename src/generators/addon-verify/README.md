## `addon-verify` Generator

The `addon-verify` generator extracts code blocks from `doc/api/addons.md` and generates a file list to facilitate C++ compilation and JavaScript runtime validations for Node.js addon examples.

### Configuring

The `addon-verify` generator accepts the following configuration options:

| Name     | Type     | Default | Description                                              |
| -------- | -------- | ------- | -------------------------------------------------------- |
| `output` | `string` | -       | The directory where extracted code files will be written |
