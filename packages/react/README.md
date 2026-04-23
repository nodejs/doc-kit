# `@doc-kittens/react` — Maine Coon

> _Fun fact: The Maine Coon is among the largest domestic cat breeds — fitting for the most feature-rich generator package._

`@doc-kittens/react` provides the React/JSX-based documentation generators: a JSX AST builder, the Orama search index, and the standalone web bundle.

## Generators

| Export                        | Description                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| `@doc-kittens/react/jsx-ast`  | Transforms `MetadataEntry[]` into a JSX AST consumed by `web`         |
| `@doc-kittens/react/orama-db` | Builds an Orama search database from `MetadataEntry[]`                |
| `@doc-kittens/react/web`      | Bundles the JSX AST into HTML/CSS/JS for the standalone documentation |

## Installation

```sh
npm install @doc-kittens/react
```
