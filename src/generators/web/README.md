## `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles, producing server-side rendered HTML pages, client-side JavaScript with code splitting, and bundled CSS styles.

### Configuring

The `web` generator accepts the following configuration options:

| Name           | Type     | Default                              | Description                                                              |
| -------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `output`       | `string` | -                                    | The directory where HTML, JavaScript, and CSS files will be written      |
| `templatePath` | `string` | `'template.html'`                    | Path to the HTML template file                                           |
| `imports`      | `object` | `{ '#config/Logo': [Node.js Logo] }` | Object mapping import aliases to package names for external dependencies |
