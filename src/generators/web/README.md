## `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles, producing server-side rendered HTML pages, client-side JavaScript with code splitting, and bundled CSS styles.

### Configuring

The `web` generator accepts the following configuration options:

| Name           | Type     | Default           | Description                                                           |
| -------------- | -------- | ----------------- | --------------------------------------------------------------------- |
| `output`       | `string` | -                 | The directory where HTML, JavaScript, and CSS files will be written   |
| `templatePath` | `string` | `'template.html'` | Path to the HTML template file                                        |
| `imports`      | `object` | See below         | Object mapping `#theme/` aliases to component paths for customization |

#### Default `imports`

| Alias               | Default                                      | Description                                  |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| `#theme/Logo`       | `@node-core/ui-components/Common/NodejsLogo` | Logo rendered inside the navigation bar      |
| `#theme/Navigation` | Built-in `NavBar` component                  | Top navigation bar                           |
| `#theme/Sidebar`    | Built-in `SideBar` component                 | Sidebar with version selector and page links |
| `#theme/Layout`     | Built-in `Layout` component                  | Outermost wrapper around the full page       |

Override any alias in your config file to swap in a custom component:

```js
// doc-kit.config.mjs
export default {
  web: {
    imports: {
      '#theme/Logo': './src/MyLogo.jsx',
      '#theme/Sidebar': './src/MySidebar.jsx',
    },
  },
};
```
