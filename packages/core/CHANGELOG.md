# @doc-kit/core

## 1.1.0

### Minor Changes

- [#1057](https://github.com/nodejs/doc-kit/pull/1057) [`da5d8e6`](https://github.com/nodejs/doc-kit/commit/da5d8e63d0d33fe7a95c46afb8d5140d576827b4) Thanks [@avivkeller](https://github.com/avivkeller)! - feat: `dependent` generators and the `section-pages` generator

## 1.0.1

### Patch Changes

- [#1023](https://github.com/nodejs/doc-kit/pull/1023) [`27a412a`](https://github.com/nodejs/doc-kit/commit/27a412ac35ab06e977b03b559e6525c0c5c5356c) Thanks [@btea](https://github.com/btea)! - Fix empty paragraphs in API docs when a typed parameter list contains trailing non-parameter items

  When a loose markdown list in the API docs starts with typed parameters (e.g. `actual`, `expected`, `Returns`) but also contains plain prose bullets (e.g. algorithm complexity notes), the entire list was previously treated as a parameter signature table. The non-parameter items had no name or type, causing them to render as empty `<section>` blocks on the built site.

  The fix splits the list at the first non-parameter item: typed items become the `FunctionSignature` table, and the remaining items render as regular markdown content.

- [#1045](https://github.com/nodejs/doc-kit/pull/1045) [`4a22c85`](https://github.com/nodejs/doc-kit/commit/4a22c85dca917f52c773aba084191da7c622687e) Thanks [@avivkeller](https://github.com/avivkeller)! - MDX nodes in the HTML-string pipelines are now dropped, and do not crash.

- [#1049](https://github.com/nodejs/doc-kit/pull/1049) [`8cc1fd0`](https://github.com/nodejs/doc-kit/commit/8cc1fd010ac38b16dd3c9bcd422c0ce0e5eb483d) Thanks [@avivkeller](https://github.com/avivkeller)! - Render markdown summaries as markup instead of as their source

## 1.0.0

### Major Changes

- [#961](https://github.com/nodejs/doc-kit/pull/961) [`c334823`](https://github.com/nodejs/doc-kit/commit/c334823a1ee7c1dc4642fa1b0dad90912de22f17) Thanks [@avivkeller](https://github.com/avivkeller)! - The doc-kit engine and CLI, previously published together as
  `@node-core/doc-kit`, are now published as two packages: `@doc-kit/core`
  (the engine) and `@doc-kit/cli` (the `doc-kit` command-line interface).
  The `@node-core/doc-kit` name now contains only the Node.js-specific
  generators (`api-links`, `addon-verify`, and `man-page`).

- [#960](https://github.com/nodejs/doc-kit/pull/960) [`c734403`](https://github.com/nodejs/doc-kit/commit/c7344034d83dd5858250a5cc386fbe729f07ede0) Thanks [@avivkeller](https://github.com/avivkeller)! - The legacy-format generators (`legacy-html`, `legacy-html-all`,
  `legacy-json`, and `legacy-json-all`) now live in the new
  `@node-core/doc-kit-legacy` package and are loaded via import specifiers such
  as `@node-core/doc-kit-legacy/legacy-html`. The corresponding
  `@doc-kit/core/*` package exports have been removed. The CLI shorthand
  names are unchanged.

- [#961](https://github.com/nodejs/doc-kit/pull/961) [`c334823`](https://github.com/nodejs/doc-kit/commit/c334823a1ee7c1dc4642fa1b0dad90912de22f17) Thanks [@avivkeller](https://github.com/avivkeller)! - The Node.js-specific generators (`api-links`, `addon-verify`, and
  `man-page`) now live in the `@node-core/doc-kit` package and are loaded
  via import specifiers such as `@node-core/doc-kit/man-page`. The
  corresponding package exports have been removed from the doc-kit engine.
  The CLI shorthand names are unchanged.

- [#959](https://github.com/nodejs/doc-kit/pull/959) [`ca36039`](https://github.com/nodejs/doc-kit/commit/ca3603916bee58fb80c1ea3a2e0023c13903fc63) Thanks [@avivkeller](https://github.com/avivkeller)! - The React/JSX-based generators (`html` — previously `web` —, `jsx-ast`,
  `llms-txt`, `sitemap`, and `orama-db`) now live in the new
  `@doc-kit/generator-react` package and are loaded via import specifiers such as
  `@doc-kit/generator-react/html`. The corresponding `@doc-kit/core/*`
  package exports have been removed. The `web` generator is renamed to `html`:
  the CLI shorthand `web` keeps working as a deprecated alias, but the
  configuration key is now `html` instead of `web`.

### Minor Changes

- [#939](https://github.com/nodejs/doc-kit/pull/939) [`7bd1b5b`](https://github.com/nodejs/doc-kit/commit/7bd1b5b15ba2a444bd9e746fb36236030919b273) Thanks [@avivkeller](https://github.com/avivkeller)! - Discover and load configuration files with `cosmiconfig`.

- [#911](https://github.com/nodejs/doc-kit/pull/911) [`ada6540`](https://github.com/nodejs/doc-kit/commit/ada6540fe6c2c32cfa254187c159941b245ebf80) Thanks [@avivkeller](https://github.com/avivkeller)! - Add banner opt-out

- [#958](https://github.com/nodejs/doc-kit/pull/958) [`0bd347d`](https://github.com/nodejs/doc-kit/commit/0bd347da847e21c2501732c0acbdee7db1b0f8f1) Thanks [@avivkeller](https://github.com/avivkeller)! - Generators are now loaded dynamically by import specifier instead of a static
  registry. `--target` accepts either a built-in shorthand name (`web`,
  `legacy-html`, …) or any import specifier resolving to a generator module
  (e.g. `some-package/generator` or `./my-generator.mjs`), and a generator's
  `dependsOn` is now a full import specifier. This lays the groundwork for
  splitting the built-in generators into separate packages and enables
  third-party generator packages.

- [#937](https://github.com/nodejs/doc-kit/pull/937) [`43a09f7`](https://github.com/nodejs/doc-kit/commit/43a09f7ae9cdd4a1863e98b067abcf104e8937f2) Thanks [@avivkeller](https://github.com/avivkeller)! - Make the `web` generator bundler-neutral through a custom adapter contract,
  with Vite 8.1 provided as the default adapter.

### Patch Changes

- [#964](https://github.com/nodejs/doc-kit/pull/964) [`96e1c26`](https://github.com/nodejs/doc-kit/commit/96e1c26482098aec1753d5fb1aeacb607f7e097f) Thanks [@avivkeller](https://github.com/avivkeller)! - Add `web.navigation`, which supplies the sidebar groups (`navigation.sidebar`)
  and the navigation bar items (`navigation.navbar`) from configuration.

- [#955](https://github.com/nodejs/doc-kit/pull/955) [`b80958f`](https://github.com/nodejs/doc-kit/commit/b80958ff53dd2388d33ce8ed282b14a67d3374f0) Thanks [@avivkeller](https://github.com/avivkeller)! - Close Orama search when the target link is on the same page

- [#968](https://github.com/nodejs/doc-kit/pull/968) [`d3306a2`](https://github.com/nodejs/doc-kit/commit/d3306a20bf913d2c83739215bc5692434ceef166) Thanks [@pimterry](https://github.com/pimterry)! - Resolve unions and arrays of display-name types (`{HTTP/2 Headers Object | vm.Module}`, `{HTTP/2 Headers Object[]}`), and stop capturing prose such as `U+007B ({), and U+007D (}).` as a type annotation.

- [#889](https://github.com/nodejs/doc-kit/pull/889) [`68751af`](https://github.com/nodejs/doc-kit/commit/68751af17a45cc0c8e76d36308fb1be3f1dec4af) Thanks [@bmuenzenmeyer](https://github.com/bmuenzenmeyer)! - Fix `relative()` URL resolution when the target path is a prefix of the current
  page's path (e.g. `/generators` from `/generators/web`): the target's final
  segment was consumed as a common directory, producing `.` instead of
  `../generators`. Unreachable in flat page layouts; surfaced by sites with
  nested input directories.

- [#945](https://github.com/nodejs/doc-kit/pull/945) [`70b7526`](https://github.com/nodejs/doc-kit/commit/70b75269e9d0ed6b199c217bb268de96e65645c9) Thanks [@avivkeller](https://github.com/avivkeller)! - Moved the package into a `packages/core` workspace.

- [#1002](https://github.com/nodejs/doc-kit/pull/1002) [`740b613`](https://github.com/nodejs/doc-kit/commit/740b613ded7326eada843c34809ea128c6a9d7b5) Thanks [@avivkeller](https://github.com/avivkeller)! - Defaults are now project-neutral instead of Node.js-specific

- [#946](https://github.com/nodejs/doc-kit/pull/946) [`9ab2840`](https://github.com/nodejs/doc-kit/commit/9ab2840559d2f04a6db6b29bbf6c6d470a1dde0b) Thanks [@btea](https://github.com/btea)! - Fix missing spaces in the riscv64 multithreading warning message, which
  previously concatenated as "failures whenallocating" and "spaceon riscv64".

- [#933](https://github.com/nodejs/doc-kit/pull/933) [`b73b704`](https://github.com/nodejs/doc-kit/commit/b73b70474a2c499c1be315ebf2595e6932124e19) Thanks [@vsolano9](https://github.com/vsolano9)! - Use short `DEP` codes for deprecation heading anchors.

- [#942](https://github.com/nodejs/doc-kit/pull/942) [`cef45ca`](https://github.com/nodejs/doc-kit/commit/cef45caf14cba83c77c373f59cee7f33f9f3df9b) Thanks [@btea](https://github.com/btea)! - Space union separators in type annotation values (`{string|URL}` is now rendered as `string | URL`).

- [#934](https://github.com/nodejs/doc-kit/pull/934) [`e6f1769`](https://github.com/nodejs/doc-kit/commit/e6f176958f6323d054dc86c4437accc9340e6914) Thanks [@avivkeller](https://github.com/avivkeller)! - Switches `oxc-parser` for `@swc/wasm`, since `oxc-parser` does not provide the needed bindings.

- [#919](https://github.com/nodejs/doc-kit/pull/919) [`d0f0de0`](https://github.com/nodejs/doc-kit/commit/d0f0de069e9061b6684269b412029bdd3dd288ba) Thanks [@MFA-G](https://github.com/MFA-G)! - Preserve deprecation codes in generated table-of-contents labels.

- [#963](https://github.com/nodejs/doc-kit/pull/963) [`2f9defe`](https://github.com/nodejs/doc-kit/commit/2f9defe49cac2d0e95c6fb213075291509a50a5f) Thanks [@btea](https://github.com/btea)! - Sync the URL hash when following same-page search hits

- [#955](https://github.com/nodejs/doc-kit/pull/955) [`b80958f`](https://github.com/nodejs/doc-kit/commit/b80958ff53dd2388d33ce8ed282b14a67d3374f0) Thanks [@avivkeller](https://github.com/avivkeller)! - Render markdown `code` snippets in the sidebar

- Updated dependencies [[`1da2390`](https://github.com/nodejs/doc-kit/commit/1da239076622e792145a38d2045dee404c3ad75f), [`c734403`](https://github.com/nodejs/doc-kit/commit/c7344034d83dd5858250a5cc386fbe729f07ede0), [`4bafb28`](https://github.com/nodejs/doc-kit/commit/4bafb287eda25dc07be9525e16aa6bfc63ebad1d), [`c334823`](https://github.com/nodejs/doc-kit/commit/c334823a1ee7c1dc4642fa1b0dad90912de22f17), [`740b613`](https://github.com/nodejs/doc-kit/commit/740b613ded7326eada843c34809ea128c6a9d7b5), [`740b613`](https://github.com/nodejs/doc-kit/commit/740b613ded7326eada843c34809ea128c6a9d7b5), [`43673d1`](https://github.com/nodejs/doc-kit/commit/43673d1785642cd26a3c6b5406a34d9eea42c68d), [`bfa8f0e`](https://github.com/nodejs/doc-kit/commit/bfa8f0e3bb49cba6bcbe780a61caf3e785bcb23b), [`ca36039`](https://github.com/nodejs/doc-kit/commit/ca3603916bee58fb80c1ea3a2e0023c13903fc63)]:
  - @doc-kit/generator-react@0.1.0
  - @node-core/doc-kit-legacy@1.0.0
  - @node-core/doc-kit@2.0.0

## 1.4.3

### Patch Changes

- [#905](https://github.com/nodejs/doc-kit/pull/905) [`f214a00`](https://github.com/nodejs/doc-kit/commit/f214a009d5ceadddc2a3b8d83b94eb070eb6e790) Thanks [@avivkeller](https://github.com/avivkeller)! - Allow for the specification of dynamically generated configuration values

## 1.4.2

### Patch Changes

- [#855](https://github.com/nodejs/doc-kit/pull/855) [`d7bdf39`](https://github.com/nodejs/doc-kit/commit/d7bdf39cc60852aaec42b6846fbacb89aecf3eec) Thanks [@bmuenzenmeyer](https://github.com/bmuenzenmeyer)! - Adopt Changesets for releases: versioning and publishing are now driven by changeset files, which
  produce a `CHANGELOG.md`, git tags, and GitHub Releases.

- [#895](https://github.com/nodejs/doc-kit/pull/895) [`9d7ce14`](https://github.com/nodejs/doc-kit/commit/9d7ce14c0fa11ee34b475cb5a752ce7e2cd44cb2) Thanks [@avivkeller](https://github.com/avivkeller)! - Avoids directly mutating the AST in `legacy-json`, as to ensure future generators do not run with a input different than they expect.
