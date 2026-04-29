## `web-all` Generator

The `web-all` generator creates a single `all.html` file containing all API documentation modules rendered through the `web` generator pipeline. This is the modern equivalent of `legacy-html-all` for the new web tooling.

It is intended for offline browsing and for environments where JavaScript is unavailable: the in-page searchbar shipped with `web` requires JS, so a single all-in-one page makes browser-native text search (`Ctrl`+`F`) usable across the full documentation set.

### Configuring

The `web-all` generator accepts the following configuration options:

| Name           | Type     | Default              | Description                                    |
| -------------- | -------- | -------------------- | ---------------------------------------------- |
| `output`       | `string` | -                    | The directory where `all.html` will be written |
| `templatePath` | `string` | Inherited from `web` | Path to the HTML template file                 |
