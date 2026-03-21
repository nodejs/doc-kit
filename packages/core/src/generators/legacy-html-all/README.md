## `legacy-html-all` Generator

The `legacy-html-all` generator creates a single `all.html` file containing all API documentation modules in one file, based on the output from the `legacy-html` generator.

### Configuring

The `legacy-html-all` generator accepts the following configuration options:

| Name           | Type      | Default                      | Description                                    |
| -------------- | --------- | ---------------------------- | ---------------------------------------------- |
| `output`       | `string`  | -                            | The directory where `all.html` will be written |
| `templatePath` | `string`  | Inherited from `legacy-html` | Path to the HTML template file                 |
| `minify`       | `boolean` | Inherited from `global`      | Whether to minify the output HTML              |
| `version`      | `object`  | Inherited from `global`      | Version object containing version information  |
