# @node-core/doc-kit

## 1.5.0

### Minor Changes

- [#911](https://github.com/nodejs/doc-kit/pull/911) [`ada6540`](https://github.com/nodejs/doc-kit/commit/ada6540fe6c2c32cfa254187c159941b245ebf80) Thanks [@avivkeller](https://github.com/avivkeller)! - Add banner opt-out

### Patch Changes

- [#889](https://github.com/nodejs/doc-kit/pull/889) [`68751af`](https://github.com/nodejs/doc-kit/commit/68751af17a45cc0c8e76d36308fb1be3f1dec4af) Thanks [@bmuenzenmeyer](https://github.com/bmuenzenmeyer)! - Fix `relative()` URL resolution when the target path is a prefix of the current
  page's path (e.g. `/generators` from `/generators/web`): the target's final
  segment was consumed as a common directory, producing `.` instead of
  `../generators`. Unreachable in flat page layouts; surfaced by sites with
  nested input directories.

- [#934](https://github.com/nodejs/doc-kit/pull/934) [`e6f1769`](https://github.com/nodejs/doc-kit/commit/e6f176958f6323d054dc86c4437accc9340e6914) Thanks [@avivkeller](https://github.com/avivkeller)! - Switches `oxc-parser` for `@swc/wasm`, since `oxc-parser` does not provide the needed bindings.

- [#919](https://github.com/nodejs/doc-kit/pull/919) [`d0f0de0`](https://github.com/nodejs/doc-kit/commit/d0f0de069e9061b6684269b412029bdd3dd288ba) Thanks [@MFA-G](https://github.com/MFA-G)! - Preserve deprecation codes in generated table-of-contents labels.

## 1.4.3

### Patch Changes

- [#905](https://github.com/nodejs/doc-kit/pull/905) [`f214a00`](https://github.com/nodejs/doc-kit/commit/f214a009d5ceadddc2a3b8d83b94eb070eb6e790) Thanks [@avivkeller](https://github.com/avivkeller)! - Allow for the specification of dynamically generated configuration values

## 1.4.2

### Patch Changes

- [#855](https://github.com/nodejs/doc-kit/pull/855) [`d7bdf39`](https://github.com/nodejs/doc-kit/commit/d7bdf39cc60852aaec42b6846fbacb89aecf3eec) Thanks [@bmuenzenmeyer](https://github.com/bmuenzenmeyer)! - Adopt Changesets for releases: versioning and publishing are now driven by changeset files, which
  produce a `CHANGELOG.md`, git tags, and GitHub Releases.

- [#895](https://github.com/nodejs/doc-kit/pull/895) [`9d7ce14`](https://github.com/nodejs/doc-kit/commit/9d7ce14c0fa11ee34b475cb5a752ce7e2cd44cb2) Thanks [@avivkeller](https://github.com/avivkeller)! - Avoids directly mutating the AST in `legacy-json`, as to ensure future generators do not run with a input different than they expect.
