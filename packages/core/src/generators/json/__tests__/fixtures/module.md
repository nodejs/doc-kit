# Widgets

<!--introduced_in=v1.0.0-->

<!--name=widgets-->

<!-- source_link=lib/widgets.js -->

> Stability: 2 - Stable

The `node:widgets` module makes {Widget} objects. See [`widgets.create()`][].

```js displayName="Making a widget"
const { create } = require('node:widgets');
```

## Class: `widgets.Widget`

<!-- YAML
added: v1.0.0
changes:
  - version: v2.0.0
    pr-url: https://github.com/example/widgets/pull/2
    description: Widgets now emit `'ready'`.
-->

- Extends: {EventEmitter}

A widget.

### `new Widget(name[, options])`

<!-- YAML
added:
  - v1.0.0
  - v0.9.0
-->

- `name` {string} The widget's name.
- `options` {Object}
  - `size` {number} The size. **Default:** `1`.
  - `signal` {AbortSignal} Cancels the widget.

### `new Widget(options)`

<!-- YAML
added: v1.5.0
-->

- `options` {Object}

### Event: `'ready'`

<!-- YAML
added: v2.0.0
-->

- `widget` {Widget} The widget that is ready.

Emitted once the widget is ready.

### `widget.render([...targets])`

- `...targets` {string[]} Where to render.
- Returns: {Promise} Fulfills once rendered.

Renders the widget.

```mjs
await widget.render();
```

### `widget.size`

<!-- YAML
added: v1.0.0
deprecated: v2.0.0
-->

> Stability: 0 - Deprecated: Use [`widget.render()`][] instead.

- Type: {number} The widget's size. **Default:** `1`.

### Static method: `Widget.from(source)`

- `source` {string|Buffer} A serialized widget.
- Returns: {Widget}

## Notes

A prose section with a list that stays prose:

- One thing
- Another thing

### `globalThis.widget`

<!-- YAML
added: v1.0.0
type: global
-->

- Type: {Widget}

The default widget.

[`widgets.create()`]: #widgetscreate
[`widget.render()`]: #widgetrendertargets
