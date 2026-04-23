## `man-page` Generator

The `man-page` generator creates a Unix man page version of the Node.js CLI documentation in mdoc format.

### Configuring

The `man-page` generator accepts the following configuration options:

| Name                   | Type     | Default                     | Description                                           |
| ---------------------- | -------- | --------------------------- | ----------------------------------------------------- |
| `output`               | `string` | -                           | The directory where the man page file will be written |
| `fileName`             | `string` | `'node.1'`                  | Name of the output file                               |
| `cliOptionsHeaderSlug` | `string` | `'options'`                 | Slug for the CLI options header section               |
| `envVarsHeaderSlug`    | `string` | `'environment-variables-1'` | Slug for the environment variables header section     |
| `templatePath`         | `string` | `'template.1'`              | Path to the man page template file                    |
