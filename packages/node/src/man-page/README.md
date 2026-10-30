# Man page

The `man-page` generator builds a Unix manual page, in mdoc format, from the
page that documents a command's options and environment variables. Node.js
uses it to build `node.1` from `doc/api/cli.md`, and it works for any command
documented the same way.

## Usage

The defaults fit Node.js's own page. From the root of a Node.js checkout:

```bash
npx @doc-kit/cli generate -t man-page -i doc/api/cli.md -o out
```

This writes `out/node.1`; on Linux, read it with `man -l out/node.1`. Pass only
the command-line page as input, since the generator looks for its two sections
across everything it reads. For another command, see
[Using your own template](#using-your-own-template).

## Configuring

- `fileName` {string} The name of the file to write. **Default:** `'node.1'`.
- `templatePath` {string} The mdoc template to fill in, as an absolute path or
  a path relative to the working directory. **Default:** the Node.js template
  that ships with the generator (`template.1`).
- `cliOptionsHeaderSlug` {string} The slug of the heading that starts the
  options section. **Default:** `'options'`.
- `envVarsHeaderSlug` {string} The slug of the heading that starts the
  environment variables section. **Default:** `'environment-variables-1'`, the
  second "Environment variables" heading in Node.js's `cli.md`.

It writes to `output`, a
[global option](https://doc-kit.nodejs.org/configuration#global-options).

## Writing the command-line page

The generator finds two sections by the slugs of their headings, and turns
every `###` heading in them into an entry of the man page:

```md displayName="docs/cli.md"
# Command-line reference

## Options

### `-o`, `--output=dir`

Writes the result to _dir_ instead of the working directory.

### `--quiet`

Prints nothing but errors.

## Environment variables

### `MYTOOL_HOME=dir`

Where mytool keeps its cache. **Default:** `~/.mytool`.

## Exit codes

`0` on success, `1` on any error.
```

- Options are the `###` headings between the options heading and the
  environment variables heading, so the options section must come first.
- Environment variables are the `###` headings after their heading, up to the
  next `#` or `##` heading.
- Text right under a section heading, and `####` headings with their content,
  are left out.

A slug is the anchor doc-kit gives a heading: GitHub-style, lowercase with hyphens for spaces, and with `-1`, `-2` and so on
when the same heading appears earlier on the page. Node.js's `cli.md` has a
`#### Environment variables` heading under `--run`, so its section is
`environment-variables-1`. A page like the one above, with a single
"Environment variables" heading, needs `envVarsHeaderSlug` set to
`'environment-variables'`.

> [!WARNING]
> When a slug matches no heading, the generator doesn't fail. It still writes
> the man page, with entries in the wrong section or missing. If the output
> looks off, check the slugs first.

### Headings

Write an option heading as its flags, each in a code span, separated by a
comma and a space. Put the flag's argument after `=` or a space, and wrap an
optional argument in brackets. Write an environment variable heading as its
name, followed by `=` and a value if it takes one.

| Heading                         | In the man page           |
| ------------------------------- | ------------------------- |
| `` `-o`, `--output=dir` ``      | `-o, --output=dir`        |
| `` `-e`, `--eval "script"` ``   | `-e, --eval script`       |
| `` `--inspect[=[host:]port]` `` | `--inspect=[[host:]port]` |
| `` `MYTOOL_HOME=dir` ``         | `MYTOOL_HOME dir`         |

### Descriptions

The content under each entry's heading becomes its description. The generator
keeps:

- Paragraphs, run together into one block of text, without paragraph breaks.
- Inline code and bold text, as bold.
- Type annotations, such as `{string}`, as bold text with their braces.
- Emphasis, as italic.
- Lists, as bullet lists.
- Fenced code blocks, as literal blocks.
- Links, as their text, without the URL.

Everything else is left out, including tables, blockquotes (stability notes
and alerts too), images and HTML, so YAML metadata comments don't show up.

## Using your own template

The default template describes Node.js: its name, synopsis, description and
links are all about `node`. For another command, write your own.

A template is an mdoc file with two placeholders, `__OPTIONS__` and
`__ENVIRONMENT__`. The generator replaces the first occurrence of each with the
entries it builds. Those entries are `.It` items, so put each placeholder
inside a `.Bl -tag` list:

```text displayName="man/template.1"
.Dd $Mdocdate$
.Dt MYTOOL 1
.Os
.Sh NAME
.Nm mytool
.Nd builds things
.Sh SYNOPSIS
.Nm
.Op Ar options
.Ar input
.Sh OPTIONS
.Bl -tag -width 6n
__OPTIONS__
.El
.Sh ENVIRONMENT
.Bl -tag -width 6n
__ENVIRONMENT__
.El
```

Then set the template, the file name and the slugs your page needs:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  'man-page': {
    fileName: 'mytool.1',
    envVarsHeaderSlug: 'environment-variables',
    templatePath: join(import.meta.dirname, 'man/template.1'),
  },
};
```

With the page from
[Writing the command-line page](#writing-the-command-line-page),
`npx @doc-kit/cli generate -t man-page -i docs/cli.md -o out` writes
`out/mytool.1`. In `man -l out/mytool.1`, after the name and synopsis from the
template, its sections read:

```text
OPTIONS
     -o, --output=dir
             Writes the result to dir instead of the working directory.

     --quiet
             Prints nothing but errors.

ENVIRONMENT
     MYTOOL_HOME dir
             Where mytool keeps its cache. Default: ~/.mytool.
```
