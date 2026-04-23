# `@doc-kittens/internal` — Russian Blue

> _Fun fact: The Russian Blue is renowned for its quiet, reserved nature — much like the internal generators that quietly power everything downstream._

`@doc-kittens/internal` provides the foundational documentation generators (AST construction, AST-JS extraction, and metadata aggregation) that other `@doc-kittens` packages build on top of.

## Generators

| Export                           | Description                                                               |
| -------------------------------- | ------------------------------------------------------------------------- |
| `@doc-kittens/internal/ast`      | Parses Markdown files into a unified AST tree                             |
| `@doc-kittens/internal/ast-js`   | Extracts an AST from JavaScript source files (acorn-based)                |
| `@doc-kittens/internal/metadata` | Walks the AST and produces `MetadataEntry[]` consumed by other generators |

## Installation

```sh
npm install @doc-kittens/internal
```
