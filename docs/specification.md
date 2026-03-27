# Specification

**Version**: 1.0.0

**Authored By**: Aviv Keller (<me@aviv.sh>)

This document specifies the Markdown format consumed by
[`@node-core/doc-kit`][doc-kit]. It defines the structural, syntactic, and
semantic rules that documents MUST follow to be correctly parsed. The format
is a strict superset of [GitHub Flavored Markdown][gfm] (which itself is a
strict superset of [CommonMark][commonmark]), adding conventions for API
metadata, type annotations, stability indicators, and structured parameter
lists.

Because this format is a superset, all constructs valid in [GFM][gfm] remain
valid here. This specification only defines the **additional** constraints and
semantics layered on top. Where a [GFM][gfm] construct is given special
meaning by this specification (e.g., blockquotes as stability indicators,
unordered lists as typed parameter lists), that special meaning is documented
in the relevant section.

## Table of Contents

- [1. Terminology and Conventions](#1-terminology-and-conventions)
  - [1.1. Requirement Level Keywords](#11-requirement-level-keywords)
  - [1.2. Definitions](#12-definitions)
- [2. Conformance](#2-conformance)
  - [2.1. Base Grammar](#21-base-grammar)
  - [2.2. Character Encoding](#22-character-encoding)
  - [2.3. Line Endings](#23-line-endings)
  - [2.4. Whitespace](#24-whitespace)
- [3. Document Structure](#3-document-structure)
  - [3.1. Top-Level Ordering](#31-top-level-ordering)
  - [3.2. Entry Ordering](#32-entry-ordering)
- [4. Headings](#4-headings)
  - [4.1. Style](#41-style)
  - [4.2. Depth Semantics](#42-depth-semantics)
    - [4.2.1. Depth 1](#421-depth-1)
    - [4.2.2. Depth 2](#422-depth-2)
    - [4.2.3. Additional Depths](#423-additional-depths)
  - [4.3. Entry Type Classification](#43-entry-type-classification)
    - [4.3.1. Method](#431-method)
    - [4.3.2. Event](#432-event)
    - [4.3.3. Class](#433-class)
    - [4.3.4. Constructor](#434-constructor)
    - [4.3.5. Static Method](#435-static-method)
    - [4.3.6. Property](#436-property)
    - [4.3.7. Default Classification](#437-default-classification)
  - [4.4. Document Type and Heading Interpretation](#44-document-type-and-heading-interpretation)
    - [4.4.1. Module Documents](#441-module-documents)
    - [4.4.2. Miscellaneous Documents](#442-miscellaneous-documents)
    - [4.4.3. Global Documents](#443-global-documents)
    - [4.4.4. Module Context Override](#444-module-context-override)
    - [4.4.5. Per-Entry Override](#445-per-entry-override)
  - [4.5. Heading Text Conventions](#45-heading-text-conventions)
    - [4.5.1. Code Spans in Headings](#451-code-spans-in-headings)
    - [4.5.2. Event Name Quoting](#452-event-name-quoting)
    - [4.5.3. Multiple Forms](#453-multiple-forms)
- [5. Signature Syntax](#5-signature-syntax)
  - [5.1. Required Parameters](#51-required-parameters)
  - [5.2. Optional Parameters](#52-optional-parameters)
  - [5.3. Nested Optionals](#53-nested-optionals)
  - [5.4. Rest Parameters](#54-rest-parameters)
  - [5.5. Constraints](#55-constraints)
- [6. YAML Comment Blocks](#6-yaml-comment-blocks)
  - [6.1. Block Syntax](#61-block-syntax)
  - [6.2. Simple Directives](#62-simple-directives)
    - [6.2.1. `introduced_in`](#621-introduced_in)
    - [6.2.2. `type`](#622-type)
    - [6.2.3. `name`](#623-name)
    - [6.2.4. `source_link`](#624-source_link)
    - [6.2.5. `llm_description`](#625-llm_description)
    - [6.2.6. `module`](#626-module)
  - [6.3. YAML Metadata Fields](#63-yaml-metadata-fields)
    - [6.3.1. `added`](#631-added)
    - [6.3.2. `deprecated`](#632-deprecated)
    - [6.3.3. `removed`](#633-removed)
    - [6.3.4. `napiVersion`](#634-napiversion)
    - [6.3.5. `changes`](#635-changes)
    - [6.3.6. `type` (Override)](#636-type-override)
    - [6.3.7. `source_link`](#637-source_link)
    - [6.3.8. `llm_description`](#638-llm_description)
  - [6.4. Version Strings](#64-version-strings)
  - [6.5. Plain Tag Comments](#65-plain-tag-comments)
  - [6.6. Frontmatter Conversion](#66-frontmatter-conversion)
  - [6.7. Placement](#67-placement)
- [7. Stability Indicators](#7-stability-indicators)
  - [7.1. Syntax](#71-syntax)
  - [7.2. Levels](#72-levels)
    - [7.2.1. Level 0 - Deprecated](#721-level-0--deprecated)
    - [7.2.2. Level 1 - Experimental](#722-level-1--experimental)
    - [7.2.3. Level 2 - Stable](#723-level-2--stable)
    - [7.2.4. Level 3 - Legacy](#724-level-3--legacy)
  - [7.3. Sub-Levels](#73-sub-levels)
    - [7.3.1. 1.0 - Early Development](#731-10--early-development)
    - [7.3.2. 1.1 - Active Development](#732-11--active-development)
    - [7.3.3. 1.2 - Release Candidate](#733-12--release-candidate)
  - [7.4. Multi-Line Indicators](#74-multi-line-indicators)
  - [7.5. Inline Content](#75-inline-content)
  - [7.6. Placement](#76-placement)
- [8. Type Annotations](#8-type-annotations)
  - [8.1. Syntax](#81-syntax)
  - [8.2. Primitive Types](#82-primitive-types)
  - [8.3. Global Types](#83-global-types)
  - [8.4. Custom Types](#84-custom-types)
  - [8.5. Compound Types](#85-compound-types)
    - [8.5.1. Union Types](#851-union-types)
    - [8.5.2. Array Types](#852-array-types)
    - [8.5.3. Generic Types](#853-generic-types)
  - [8.6. Resolution Order](#86-resolution-order)
  - [8.7. Unresolved Types](#87-unresolved-types)
- [9. Typed Parameter Lists](#9-typed-parameter-lists)
  - [9.1. Identification](#91-identification)
  - [9.2. Item Structure](#92-item-structure)
  - [9.3. Special Prefixes](#93-special-prefixes)
    - [9.3.1. `Returns:`](#931-returns)
    - [9.3.2. `Extends:`](#932-extends)
    - [9.3.3. `Type:`](#933-type)
  - [9.4. Nested Properties](#94-nested-properties)
  - [9.5. Default Values](#95-default-values)
  - [9.6. Placement](#96-placement)
- [10. Code Blocks](#10-code-blocks)
  - [10.1. Fence Style](#101-fence-style)
  - [10.2. Info Strings](#102-info-strings)
  - [10.3. The `displayName` Attribute](#103-the-displayname-attribute)
- [11. Links and Cross-References](#11-links-and-cross-references)
  - [11.1. Reference-Style Links](#111-reference-style-links)
  - [11.2. Cross-Document Links](#112-cross-document-links)
  - [11.3. External Links](#113-external-links)
  - [11.4. System-Call Auto-Linking](#114-system-call-auto-linking)
  - [11.5. Type Auto-Linking](#115-type-auto-linking)
  - [11.6. Link Reference Definitions](#116-link-reference-definitions)

---

## 1. Terminology and Conventions

### 1.1. Requirement Level Keywords

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in [BCP 14][bcp-14]
([RFC 2119][rfc-2119], [RFC 8174][rfc-8174]) when, and only when, they appear
in ALL CAPITALS, as shown here.

### 1.2. Definitions

The following terms are used throughout this specification with the meanings
given below.

**Document.** A single Markdown source file conforming to this specification.
Each [document][term-document] describes one API module, one conceptual topic,
or one index listing.

**Entry.** A discrete API element within a [document][term-document]. An
[entry][term-entry] begins at a [heading][§4] and extends to the next heading
of equal or lesser depth, or to the end of the file. An entry comprises a
heading, optional [YAML metadata][§6], optional
[stability indicator][§7], optional [typed parameter list][§9], and a prose
body.

**Section.** A contiguous range of [entries][term-entry] sharing a common
parent [heading][§4].

**Typed list.** An unordered list whose items follow the typed parameter
syntax defined in [§9][§9]. [Typed lists][term-typed-list] provide structured
[type][§8], [default-value][§9.5], and description metadata for function
parameters, return values, or object properties.

**Stability indicator.** A blockquote element whose text content begins with
`Stability: ` followed by a numeric level, indicating the API lifecycle stage
of the enclosing [entry][term-entry]. See [§7][§7].

**YAML metadata block.** An [HTML comment][cm-html-comment] whose content
begins with the keyword `YAML` and contains [YAML 1.2][yaml-1.2] data
providing version-history and classification metadata for the enclosing
[entry][term-entry]. See [§6][§6].

**Simple directive.** An [HTML comment][cm-html-comment] whose content follows
the compact `key=value` pattern, providing [document][term-document]-level or
[section][term-section]-level metadata. See [§6.2][§6.2].

**Type annotation.** A reference to a type enclosed in `{curly braces}` within
a [typed list][term-typed-list] item, or in prose, that is resolved to a
hyperlink. See [§8][§8].

---

## 2. Conformance

### 2.1. Base Grammar

A conforming [document][term-document] MUST be valid [GitHub Flavored
Markdown][gfm] (GFM), which is itself a superset of [CommonMark][commonmark].
This specification is a strict superset of [GFM][gfm]: all [GFM][gfm]
constructs are valid, and this specification layers additional structure and
semantics on top.

Where this specification assigns special meaning to a [GFM][gfm] construct
(for example, blockquotes used as [stability indicators][§7], or unordered
lists used as [typed parameter lists][§9]), that special meaning is defined in
the relevant section. All other [GFM][gfm] constructs retain their standard
behavior.

### 2.2. Character Encoding

Documents MUST be encoded in [UTF-8][rfc-3629]. A byte order mark (BOM) MUST
NOT be present.

### 2.3. Line Endings

Documents SHOULD use LF (`U+000A`) line endings. Both LF and CRLF
(`U+000D U+000A`) MUST be accepted by a conforming implementation. Documents
MUST end with a trailing newline.

### 2.4. Whitespace

Indentation MUST use spaces. Tab characters (`U+0009`) MUST NOT appear in
document source except within [fenced code block][§10] content, where they
reproduce literal output.

---

## 3. Document Structure

### 3.1. Top-Level Ordering

A conforming [document][term-document] MUST contain elements in the following
order. Items marked OPTIONAL MAY be omitted entirely.

1. **Title heading** (REQUIRED) - Exactly one [ATX heading][cm-atx-heading]
   at depth 1.
2. **[Simple directives][§6.2]** (OPTIONAL) - Zero or more
   [HTML comment][cm-html-comment] directives providing
   [document][term-document]-level metadata. These MUST immediately follow
   the title heading.
3. **Module-level [stability indicator][§7]** (OPTIONAL) - A stability
   blockquote applying to the [document][term-document] as a whole.
4. **Introductory prose** (OPTIONAL) - Free-form Markdown content.
5. **API [entry][term-entry] [sections][term-section]** (OPTIONAL,
   REPEATABLE) - One or more [headings][§4] at depth 2 or greater, each
   introducing an [entry][term-entry]. Each entry follows the sub-ordering
   in [§3.2][§3.2].
6. **[Link reference definitions][§11.6]** (OPTIONAL) - Collected at the end
   of the file, after all [entry][term-entry] [sections][term-section].

### 3.2. Entry Ordering

Within each API [entry][term-entry], elements MUST appear in this order:

1. **[Heading][§4]** (REQUIRED) - An [ATX heading][cm-atx-heading].
2. **[YAML metadata block][§6]** (OPTIONAL) - Immediately following the
   heading, with no intervening content.
3. **[Stability indicator][§7]** (OPTIONAL) - A stability blockquote.
4. **[Typed parameter list][§9]** (OPTIONAL) - An unordered list describing
   parameters, return value, type, or extends clause.
5. **Prose body** (OPTIONAL) - Free-form Markdown content.
6. **Code examples** (OPTIONAL) - [Fenced code blocks][§10].
7. **Sub-[entries][term-entry]** (OPTIONAL, REPEATABLE) - Deeper
   [headings][§4] beginning nested entries, following this same ordering
   recursively.

---

## 4. Headings

### 4.1. Style

All headings MUST use [ATX style][cm-atx-heading] (`#` prefix).
[Setext-style headings][cm-setext-heading] (underline with `=` or `-`) MUST
NOT be used.

### 4.2. Depth Semantics

#### 4.2.1. Depth 1

The [document][term-document] title. Exactly one depth-1 heading MUST appear
per document.

#### 4.2.2. Depth 2

Top-level API [entries][term-entry]: classes, module-level functions,
module-level properties, module-level events, and major conceptual
[sections][term-section].

#### 4.2.3. Additional Depths

Nested API [entries][term-entry]: instance methods, instance properties, class
events, constructors, static methods, sub-properties, and further nesting.
Static methods SHOULD appear at one depth below their class heading.

Documents SHOULD NOT use heading depths greater than 5.

### 4.3. Entry Type Classification

Each [heading][§4] is classified into an [entry][term-entry] type by testing
its text against the patterns below, evaluated in the order given. The first
match wins. All pattern matching is performed on the plain text of the heading
after stripping the ATX prefix.

#### 4.3.1. Method

The heading text is a backtick-wrapped expression containing a dotted or
bracketed receiver, a member accessor, and parentheses. The parentheses
distinguish methods from [properties][§4.3.6].

```markdown
### `fs.readFile(path[, options], callback)`
### `buf.write(string[, offset[, length]][, encoding])`
### `request[Symbol.asyncIterator]()`
```

#### 4.3.2. Event

The heading text begins with the literal prefix `Event:` followed by optional
whitespace and a backtick-wrapped, single-quoted event name.

```markdown
### Event: `'close'`
### Event: `'data'`
```

#### 4.3.3. Class

The heading text begins with the literal prefix `Class:` followed by optional
whitespace and a backtick-wrapped class identifier. The class name MUST begin
with an uppercase ASCII letter.

```markdown
## Class: `http.Server`
## Class: `EventEmitterAsyncResource`
```

#### 4.3.4. Constructor

The heading text is a backtick-wrapped expression beginning with the keyword
`new`, followed by whitespace, then an uppercase-initial class identifier and
parenthesized [parameters][§5].

```markdown
### `new Agent([options])`
### `new Buffer(size)`
```

#### 4.3.5. Static Method

The heading text begins with the literal prefix `Static method:` followed by
optional whitespace and a backtick-wrapped qualified method call (with
parentheses).

```markdown
#### Static method: `Buffer.alloc(size[, fill[, encoding]])`
#### Static method: `Buffer.from(string[, encoding])`
```

#### 4.3.6. Property

The heading text is a backtick-wrapped dotted or bracketed property access
that does not contain parentheses. The absence of parentheses distinguishes
properties from [methods][§4.3.1].

```markdown
### `buf.length`
### `os.EOL`
### `http.METHODS`
```

#### 4.3.7. Default Classification

If no pattern matches, the [entry][term-entry] is classified as a
miscellaneous [section][term-section].

### 4.4. Document Type and Heading Interpretation

The [document][term-document]-level [`type` directive][§6.2.2] determines how
classified [entries][term-entry] are interpreted with respect to module
membership and export scope. The `type` establishes a **default context** for
all headings in the file. This context can be overridden at the
[section][term-section] level or at the individual [entry][term-entry] level.

#### 4.4.1. Module Documents

When `type` is `module` (or when no `type` directive is present, as `module`
is the default), classified [entries][term-entry] are treated as **exports of
the module** identified by the document's filename or
[`name` directive][§6.2.3].

A single module document MAY describe exports from more than one related
module (e.g., `fs` and `fs/promises`). The module boundary does not affect
entry classification or rendering; the classification algorithm in [§4.3][§4.3]
operates identically regardless of which module an entry belongs to. Where the
distinction does matter (e.g., for import paths or module-specific rendering),
a [module context override][§4.4.4] SHOULD be used.

```markdown
# File system

<!--type=module-->
<!--name=fs-->
```

#### 4.4.2. Miscellaneous Documents

When `type` is `misc`, headings are not assumed to be module exports.
Classified [entries][term-entry] are treated as **conceptual sections** or
standalone topics.

```markdown
# C++ addons

<!--type=misc-->
```

#### 4.4.3. Global Documents

When `type` is `global`, classified [entries][term-entry] are treated as
**global** APIs, available without an `import` or `require`. Implementations
MAY render global entries differently from module exports (e.g., omitting a
module prefix).

```markdown
# Global objects

<!--type=global-->
```

#### 4.4.4. Module Context Override

The [`module` simple directive][§6.2.6] overrides the owning module for all
sub-entries beneath the heading it is attached to. This allows a single
document to describe exports from multiple modules without splitting into
separate files.

```markdown
## Promises API

<!--module=node:fs/promises-->

### `fsPromises.readFile(path[, options])`
```

All headings beneath the annotated heading inherit the overridden module
context until the next heading of equal or lesser depth, or until another
`module` directive.

#### 4.4.5. Per-Entry Override

Individual [entries][term-entry] MAY override their classification context
using the [`type` field][§6.3.6] in a [YAML metadata block][§6]:

```markdown
### `globalThis.structuredClone(value[, options])`

<!-- YAML
added: v17.0.0
type: global
-->
```

This is useful in `module`-type documents that contain isolated global entries,
or in `misc`-type documents that contain isolated module exports.

### 4.5. Heading Text Conventions

#### 4.5.1. Code Spans in Headings

Programmatic identifiers (method names, property names, class names, event
names, flag names) MUST be wrapped in backtick code spans. Prose
[section][term-section] headings (e.g., `## Synopsis`) MUST NOT use backticks.

#### 4.5.2. Event Name Quoting

Event names SHOULD be wrapped in single quotes inside the backticks:

```markdown
### Event: `'drain'`
```

#### 4.5.3. Multiple Forms

When a single API [entry][term-entry] has multiple invocation forms (e.g.,
short and long flag names), they SHOULD be listed in a single heading
separated by `, `:

```markdown
### `-c`, `--check`
```

---

## 5. Signature Syntax

[Method][§4.3.1] and [constructor][§4.3.4] headings encode their call
signature directly in the heading text.

### 5.1. Required Parameters

Required parameters appear as bare identifiers inside the parentheses:

```markdown
### `fs.readFile(path, callback)`
```

### 5.2. Optional Parameters

Optional parameters are wrapped in square brackets:

```markdown
### `fs.readFile(path[, options], callback)`
```

### 5.3. Nested Optionals

Parameters that are only meaningful when a preceding optional parameter is
provided use nested brackets:

```markdown
### `buf.write(string[, offset[, length]][, encoding])`
```

### 5.4. Rest Parameters

Rest parameters use ellipsis notation within square brackets:

```markdown
### `path.join([...paths])`
```

### 5.5. Constraints

[Default values][§9.5] MUST NOT appear in the heading signature. Defaults are
documented in the [typed parameter list][§9] using the `**Default:**` pattern.

[Type annotations][§8] MUST NOT appear in the heading signature. Types are
documented in the [typed parameter list][§9].

---

## 6. YAML Comment Blocks

### 6.1. Block Syntax

[YAML metadata][term-yaml-block] is embedded in [HTML comments][cm-html-comment].
The opening delimiter is `<!-- YAML` (with at least one space before `YAML`)
and the closing delimiter is `-->`. The content between these delimiters MUST
be valid [YAML 1.2][yaml-1.2].

```markdown
<!-- YAML
added: v12.0.0
-->
```

The comment MUST appear on its own lines. A [heading][§4] MUST have at most
one [YAML metadata block][term-yaml-block].

### 6.2. Simple Directives

[Document][term-document]-level and [section][term-section]-level metadata
uses a compact `key=value` syntax inside [HTML comments][cm-html-comment].
Each directive has the form `<!--key=value-->`.

Document-level directives MUST appear immediately after the depth-1 heading.
Section-level directives (see [§6.2.6][§6.2.6]) MUST appear immediately after
the heading they annotate.

```markdown
# File System

<!--introduced_in=v0.10.0-->
<!--type=module-->
<!--name=fs-->
<!--source_link=lib/fs.js-->
```

Each [directive][term-simple-directive] occupies exactly one
[HTML comment][cm-html-comment]. The following keys are defined:

#### 6.2.1. `introduced_in`

A [version string][§6.4] indicating when the module was introduced.

#### 6.2.2. `type`

The [document][term-document] classification. Recognized values are `module`,
`misc`, and `global`. Implementations MAY define additional values. If no
`type` directive is present, the default is `module`.

See [§4.4][§4.4] for how document type influences heading interpretation.

#### 6.2.3. `name`

An identifier overriding the default module name derived from the filename.

#### 6.2.4. `source_link`

A relative file path to the implementation source. Rendered as a link.

#### 6.2.5. `llm_description`

A plain-text description optimized for consumption by Large Language Models,
used in preference to extracted prose where available.

#### 6.2.6. `module`

Overrides the owning module for all sub-entries beneath the annotated heading.
The value is a module specifier (e.g., `node:fs/promises`). This directive
is placed immediately after a [heading][§4], not after the depth-1 heading.

See [§4.4.4][§4.4.4] for full semantics.

```markdown
## Promises API

<!--module=node:fs/promises-->
```

### 6.3. YAML Metadata Fields

The following fields are defined within [YAML metadata blocks][term-yaml-block].
Any field not listed here is reserved for future specification and MUST be
ignored by conforming implementations that do not recognize it.

#### 6.3.1. `added`

The [version(s)][§6.4] in which this API was first available.

- **Type:** [version string][§6.4], or array of version strings for backports.
- **Example:** `added: v8.0.0`

When an API was backported, the array MUST list versions in descending order.

#### 6.3.2. `deprecated`

The [version(s)][§6.4] in which this API was deprecated.

- **Type:** [version string][§6.4], or array of version strings.
- **Example:** `deprecated: v6.0.0`

#### 6.3.3. `removed`

The [version(s)][§6.4] in which this API was removed.

- **Type:** [version string][§6.4], or array of version strings.
- **Example:** `removed: v14.0.0`

#### 6.3.4. `napiVersion`

The minimum N-API version required.

- **Type:** integer.
- **Example:** `napiVersion: 1`

#### 6.3.5. `changes`

A chronological array of change records. Each record MUST contain the
following properties:

- `version` (REQUIRED) - A [version string][§6.4] or array of version
  strings.
- `pr-url` (REQUIRED) - A full URL to the pull request.
- `description` (REQUIRED) - A human-readable description. Inline Markdown
  is permitted. Multi-line descriptions use [YAML][yaml-1.2] block-scalar
  indentation.

```yaml
changes:
  - version: v18.0.0
    pr-url: https://github.com/nodejs/node/pull/41678
    description: Passing an invalid callback now throws
      `ERR_INVALID_ARG_TYPE`.
  - version:
      - v21.7.0
      - v20.12.0
    pr-url: https://github.com/nodejs/node/pull/51289
    description: Added multi-line value support.
```

#### 6.3.6. `type` (Override)

When present in a [YAML block][term-yaml-block], this overrides the
[heading classification type][§4.3] for the enclosing [entry][term-entry].
It can also override the document-level export/global context as described
in [§4.4.5][§4.4.5].

- **Type:** string (one of the type names defined in [§4.3][§4.3], or a
  context value such as `global`).
- **Example:** `type: method`

#### 6.3.7. `source_link`

Relative path to the implementation source file. Identical semantics to the
[simple directive][§6.2.4] of the same name.

#### 6.3.8. `llm_description`

Identical semantics to the [simple directive][§6.2.5] of the same name.

### 6.4. Version Strings

Version strings MUST follow [semantic versioning][semver] with a lowercase
`v` prefix, in the form `v<MAJOR>.<MINOR>.<PATCH>`. Implementations MAY
define additional sentinel values for unreleased features (e.g., placeholder
strings that are replaced during a release process).

### 6.5. Plain Tag Comments

[HTML comments][cm-html-comment] that do not match the
[YAML block][term-yaml-block] pattern and do not match the
[simple directive][term-simple-directive] pattern are parsed as **tags**. If
the content is a simple string, it is stored as a tag on the
[entry][term-entry]:

```markdown
<!-- legacy -->
```

Implementations MAY define reserved tag values for special purposes such as
content slot markers.

### 6.6. Frontmatter Conversion

Standard [YAML][yaml-1.2] frontmatter delimited by `---` at the start of a
file is converted to a [YAML comment block][term-yaml-block] during
preprocessing. The following two forms are equivalent:

```markdown
---
introduced_in: v0.10.0
---
```

```markdown
<!-- YAML
introduced_in: v0.10.0
-->
```

Documents SHOULD use the [HTML comment][cm-html-comment] syntax directly.
Frontmatter is accepted for compatibility.

### 6.7. Placement

A [YAML metadata block][term-yaml-block] MUST immediately follow the
[heading][§4] it annotates. No content, including blank lines, MAY intervene
between the heading and its [YAML block][term-yaml-block].

---

## 7. Stability Indicators

### 7.1. Syntax

A [stability indicator][term-stability] is a blockquote whose first paragraph
begins with `Stability: ` followed by a numeric level, a dash separator
(` - `), and a textual label. The level is an integer or a decimal
[sub-level][§7.3]. The description extends to the end of the blockquote.

```markdown
> Stability: 2 - Stable
```

### 7.2. Levels

Four [stability][term-stability] levels are defined.

#### 7.2.1. Level 0 - Deprecated

The feature may emit warnings. Backward compatibility is not guaranteed.

#### 7.2.2. Level 1 - Experimental

Not subject to [semantic versioning][semver] rules. Non-backward-compatible
changes or removal may occur in any future release.

#### 7.2.3. Level 2 - Stable

Compatibility with the ecosystem is a high priority.

#### 7.2.4. Level 3 - Legacy

Still covered by [semantic versioning][semver] guarantees, but no longer
actively maintained. Other alternatives are available.

### 7.3. Sub-Levels

[Level 1][§7.2.2] supports decimal sub-levels indicating maturity within the
experimental phase. Sub-levels MUST only be used with level 1.

#### 7.3.1. 1.0 - Early Development

Unfinished and subject to substantial change.

#### 7.3.2. 1.1 - Active Development

Nearing minimum viability.

#### 7.3.3. 1.2 - Release Candidate

Expected to become stable.

### 7.4. Multi-Line Indicators

The description MAY continue on subsequent blockquote lines:

```markdown
> Stability: 1 - Experimental. This API is under active development and
> may change without notice between minor releases.
```

### 7.5. Inline Content

The description MAY contain inline Markdown such as links and code spans:

```markdown
> Stability: 3 - Legacy: Use [`alternative()`][] instead.
```

### 7.6. Placement

A [stability indicator][term-stability] MUST appear after the
[YAML metadata block][§6] (if present) and before the
[typed parameter list][§9] and prose body. A [document][term-document] SHOULD
have at most one [stability indicator][term-stability] per
[entry][term-entry].

A [stability indicator][term-stability] on the depth-1 heading applies to the
[document][term-document] as a whole.

---

## 8. Type Annotations

### 8.1. Syntax

[Type annotations][term-type-annotation] are enclosed in curly braces, such as
`{Type}`. They appear in two contexts:

- **In [typed parameter lists][§9]:** as part of item structure.
- **In prose text:** as inline references.

Both forms are auto-linked to documentation for the referenced type (see
[§8.6][§8.6]).

### 8.2. Primitive Types

Primitive types use lowercase names: `string`, `number`, `boolean`, `bigint`,
`symbol`, `null`, `undefined`, `integer`.

These MUST be resolved to documentation for JavaScript primitive data types.

### 8.3. Global Types

JavaScript built-in globals use PascalCase: `Array`, `Object`, `Function`,
`Promise`, `Error`, `RegExp`, `Map`, `Set`, `Date`, `Uint8Array`, `Buffer`,
and others.

These MUST be resolved to documentation for JavaScript global objects.

### 8.4. Custom Types

Types not in the primitive or global sets are resolved via a configurable type
map provided to the toolchain. The type map associates type names with
documentation URLs.

### 8.5. Compound Types

#### 8.5.1. Union Types

Multiple types are separated by `|` (pipe):

```
{string|Buffer|URL}
```

Spaces around the pipe are OPTIONAL. Both `{string|Buffer}` and
`{string | Buffer}` MUST be accepted.

#### 8.5.2. Array Types

The `[]` suffix denotes an array of the base type:

```
{string[]}
{Buffer[]}
```

#### 8.5.3. Generic Types

Generic types use angle brackets:

```
{Promise<string>}
{Map<string, number>}
```

The outer type and each inner type parameter are resolved independently. Inner
types MAY include [unions][§8.5.1]:

```
{Promise<string|Buffer>}
```

### 8.6. Resolution Order

Types are resolved in the following order. The first tier that produces a
match terminates resolution.

1. JavaScript primitives (see [§8.2][§8.2]).
2. JavaScript built-in globals (see [§8.3][§8.3]).
3. Implementation-defined external type mappings.
4. Custom type map entries (see [§8.4][§8.4]).
5. Dotted-name heuristic: types containing `.` are split on the first `.` to
   derive a module name and member identifier, producing a cross-document
   link of the form `<module>.md#<identifier>`.

### 8.7. Unresolved Types

If a type cannot be resolved through any tier, it SHOULD be rendered as
unlinked formatted text. Conforming implementations MUST NOT produce errors
for unresolved types.

---

## 9. Typed Parameter Lists

### 9.1. Identification

A [typed list][term-typed-list] is an unordered Markdown list recognized by
the content of its first item. A list is a [typed list][term-typed-list] if
its first item matches any of these conditions:

1. It begins with text matching one of the [special prefixes][§9.3]
   (`Returns:`, `Extends:`, `Type:`).
2. It begins with a [type-reference][§8] link (a link whose label starts with
   `<`).
3. It begins with an inline code span (the parameter name) followed by a
   space and then a [type-reference][§8] link.

### 9.2. Item Structure

Each item in a [typed list][term-typed-list] has the form:

```markdown
* `name` {Type} Description text. **Default:** `value`.
```

The components, in order, are:

1. **Bullet marker** - `*`, `+`, or `-`.
2. **Parameter name** - A backtick code span. REQUIRED for parameter items;
   absent for [`Returns:`][§9.3.1], [`Type:`][§9.3.3], and
   [`Extends:`][§9.3.2] items.
3. **[Type annotation][§8]** - A `{Type}` reference. OPTIONAL.
4. **Description** - Free-form prose. OPTIONAL.
5. **[Default value][§9.5]** - The exact pattern `**Default:** \`value\``.
   OPTIONAL.

### 9.3. Special Prefixes

#### 9.3.1. `Returns:`

Denotes the return value of a function:

```markdown
* Returns: {Promise} The file contents.
```

#### 9.3.2. `Extends:`

Denotes the superclass of a [class][§4.3.3]:

```markdown
* Extends: {EventEmitter}
```

`Extends:` items SHOULD appear as the first item in a [class][§4.3.3]
[entry's][term-entry] [typed list][term-typed-list].

#### 9.3.3. `Type:`

Denotes the type of a [property][§4.3.6] or constant:

```markdown
* Type: {string}
```

### 9.4. Nested Properties

Object parameters document their properties using indented sub-lists:

```markdown
* `options` {Object}
  * `encoding` {string} Character encoding. **Default:** `'utf8'`.
  * `flag` {string} File system flag. **Default:** `'r'`.
  * `signal` {AbortSignal} Abort signal.
```

Nesting MAY continue to arbitrary depth.

### 9.5. Default Values

Optionality is indicated by the `**Default:**` pattern. Parameters with a
documented default are considered optional. The default value MUST be wrapped
in a backtick code span:

```markdown
* `encoding` {string} **Default:** `'utf8'`.
```

### 9.6. Placement

A [typed list][term-typed-list] MUST appear after the
[stability indicator][§7] (if present) and before the prose body. When
present, the list is extracted from the content flow and represented as
structured data in output.

---

## 10. Code Blocks

### 10.1. Fence Style

Code blocks MUST use [fenced syntax][cm-fenced-code-block] (triple backticks).
[Indented code blocks][cm-indented-code-block] MUST NOT be used.

### 10.2. Info Strings

Every [fenced code block][cm-fenced-code-block] SHOULD include a language
identifier in its [info string][cm-info-string]. The language identifier is
the first whitespace-delimited token after the opening fence.

Common language identifiers include: `js`, `cjs`, `mjs`, `json`, `console`,
`bash`, `text`, `typescript`, `c`, `cpp`, `http`, `markdown`, `diff`.

### 10.3. The `displayName` Attribute

A [fenced code block][cm-fenced-code-block] MAY include a `displayName`
key-value attribute after the language identifier in the
[info string][cm-info-string]. The `displayName` provides a human-readable
label for the code block, used in rendered output. The attribute syntax is
`displayName="value"` where the value is a double-quoted string.

Implementations MAY support additional [info string][cm-info-string]
attributes using the same `key="value"` syntax.

````markdown
```js displayName="Reading a file"
const data = fs.readFileSync('/path/to/file');
```
````

---

## 11. Links and Cross-References

### 11.1. Reference-Style Links

All links SHOULD use collapsed [reference-style links][cm-link-ref-def]:

```markdown
See [`fs.readFile()`][] for details.
```

with corresponding [link reference definitions][§11.6] at the end of the
[document][term-document].

### 11.2. Cross-Document Links

Links to other [documents][term-document] in the same documentation set MUST
use relative paths with `.md` extensions in the source. Conforming
implementations MUST rewrite the `.md` extension to the appropriate output
extension (e.g., `.html`) during generation:

```markdown
[Stream documentation]: stream.md#class-streamreadable
```

### 11.3. External Links

External links MUST use full URLs including the protocol:

```markdown
[MDN Web Docs]: https://developer.mozilla.org/
```

### 11.4. System-Call Auto-Linking

References to system calls in the format `name(section)` (e.g., `open(2)`,
`read(3)`) are automatically converted to links to the appropriate manual page
documentation by conforming implementations.

### 11.5. Type Auto-Linking

[Type annotations][term-type-annotation] in prose text matching the
`{Type}` pattern ([§8.1][§8.1]) are automatically converted to hyperlinks
following the [resolution order][§8.6].

### 11.6. Link Reference Definitions

[Link reference definitions][cm-link-ref-def] SHOULD be collected at the end
of the [document][term-document], after all content
[sections][term-section]:

```markdown
[`fs.readFile()`]: #fsreadfilepath-options-callback
[`stream.Readable`]: stream.md#class-streamreadable
```

<!-- External specifications -->

[doc-kit]: https://github.com/nodejs/doc-kit
[commonmark]: https://spec.commonmark.org/0.31.2/
[gfm]: https://github.github.com/gfm/
[bcp-14]: https://www.rfc-editor.org/info/bcp14
[rfc-2119]: https://www.rfc-editor.org/rfc/rfc2119
[rfc-3629]: https://www.rfc-editor.org/rfc/rfc3629
[rfc-8174]: https://www.rfc-editor.org/rfc/rfc8174
[yaml-1.2]: https://yaml.org/spec/1.2.2/
[semver]: https://semver.org/

<!-- CommonMark spec sections -->

[cm-atx-heading]: https://spec.commonmark.org/0.31.2/#atx-headings
[cm-setext-heading]: https://spec.commonmark.org/0.31.2/#setext-headings
[cm-fenced-code-block]: https://spec.commonmark.org/0.31.2/#fenced-code-blocks
[cm-indented-code-block]: https://spec.commonmark.org/0.31.2/#indented-code-blocks
[cm-info-string]: https://spec.commonmark.org/0.31.2/#info-string
[cm-html-comment]: https://spec.commonmark.org/0.31.2/#html-blocks
[cm-link-ref-def]: https://spec.commonmark.org/0.31.2/#link-reference-definitions
[cm-emphasis]: https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis

<!-- GFM spec sections -->

[gfm-tables]: https://github.github.com/gfm/#tables-extension-
[gfm-strikethrough]: https://github.github.com/gfm/#strikethrough-extension-

<!-- Internal term definitions -->

[term-document]: #12-definitions
[term-entry]: #12-definitions
[term-section]: #12-definitions
[term-typed-list]: #12-definitions
[term-stability]: #12-definitions
[term-yaml-block]: #12-definitions
[term-simple-directive]: #12-definitions
[term-type-annotation]: #12-definitions

<!-- Internal section cross-references -->

[§3.2]: #32-entry-ordering
[§4]: #4-headings
[§4.3]: #43-entry-type-classification
[§4.3.1]: #431-method
[§4.3.3]: #433-class
[§4.3.4]: #434-constructor
[§4.3.6]: #436-property
[§4.4]: #44-document-type-and-heading-interpretation
[§4.4.4]: #444-module-context-override
[§4.4.5]: #445-per-entry-override
[§5]: #5-signature-syntax
[§6]: #6-yaml-comment-blocks
[§6.2]: #62-simple-directives
[§6.2.2]: #622-type
[§6.2.3]: #623-name
[§6.2.4]: #624-source_link
[§6.2.5]: #625-llm_description
[§6.2.6]: #626-module
[§6.3.6]: #636-type-override
[§6.4]: #64-version-strings
[§7]: #7-stability-indicators
[§7.2.2]: #722-level-1--experimental
[§7.3]: #73-sub-levels
[§8]: #8-type-annotations
[§8.1]: #81-syntax
[§8.2]: #82-primitive-types
[§8.3]: #83-global-types
[§8.4]: #84-custom-types
[§8.5.1]: #851-union-types
[§8.6]: #86-resolution-order
[§9]: #9-typed-parameter-lists
[§9.3]: #93-special-prefixes
[§9.3.1]: #931-returns
[§9.3.2]: #932-extends
[§9.3.3]: #933-type
[§9.5]: #95-default-values
[§10]: #10-code-blocks
[§11]: #11-links-and-cross-references
[§11.6]: #116-link-reference-definitions
