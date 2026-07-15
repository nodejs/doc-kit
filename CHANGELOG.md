# @node-core/doc-kit

## 1.4.3

### Patch Changes

- [#905](https://github.com/nodejs/doc-kit/pull/905) [`f214a00`](https://github.com/nodejs/doc-kit/commit/f214a009d5ceadddc2a3b8d83b94eb070eb6e790) Thanks [@avivkeller](https://github.com/avivkeller)! - Allow for the specification of dynamically generated configuration values

## 1.4.2

### Patch Changes

- [#855](https://github.com/nodejs/doc-kit/pull/855) [`d7bdf39`](https://github.com/nodejs/doc-kit/commit/d7bdf39cc60852aaec42b6846fbacb89aecf3eec) Thanks [@bmuenzenmeyer](https://github.com/bmuenzenmeyer)! - Adopt Changesets for releases: versioning and publishing are now driven by changeset files, which
  produce a `CHANGELOG.md`, git tags, and GitHub Releases.

- [#895](https://github.com/nodejs/doc-kit/pull/895) [`9d7ce14`](https://github.com/nodejs/doc-kit/commit/9d7ce14c0fa11ee34b475cb5a752ce7e2cd44cb2) Thanks [@avivkeller](https://github.com/avivkeller)! - Avoids directly mutating the AST in `legacy-json`, as to ensure future generators do not run with a input different than they expect.
