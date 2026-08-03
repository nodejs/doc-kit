# `ast` Generator

The `ast` generator parses Markdown API documentation files into AST (Abstract Syntax Tree) representations, parallelizing the parsing across worker threads for better performance.

## Configuring

- `input` {string|string[]} Glob pattern(s) for the Markdown files to parse.
- `ignore` {string|string[]} Glob pattern(s) for files to exclude from parsing.
