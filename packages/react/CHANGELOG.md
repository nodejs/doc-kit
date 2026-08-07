# @nodejs/doc-kit-generator-react

## 0.1.0

### Minor Changes

- [#1002](https://github.com/nodejs/doc-kit/pull/1002) [`740b613`](https://github.com/nodejs/doc-kit/commit/740b613ded7326eada843c34809ea128c6a9d7b5) Thanks [@avivkeller](https://github.com/avivkeller)! - Defaults are now project-neutral instead of Node.js-specific

- [#959](https://github.com/nodejs/doc-kit/pull/959) [`ca36039`](https://github.com/nodejs/doc-kit/commit/ca3603916bee58fb80c1ea3a2e0023c13903fc63) Thanks [@avivkeller](https://github.com/avivkeller)! - The React/JSX-based generators (`html` — previously `web` —, `jsx-ast`,
  `llms-txt`, `sitemap`, and `orama-db`) now live in the new
  `@nodejs/doc-kit-generator-react` package and are loaded via import specifiers such as
  `@nodejs/doc-kit-generator-react/html`. The corresponding `@nodejs/doc-kit/*`
  package exports have been removed. The `web` generator is renamed to `html`:
  the CLI shorthand `web` keeps working as a deprecated alias, but the
  configuration key is now `html` instead of `web`.

### Patch Changes

- Updated dependencies [[`96e1c26`](https://github.com/nodejs/doc-kit/commit/96e1c26482098aec1753d5fb1aeacb607f7e097f), [`7bd1b5b`](https://github.com/nodejs/doc-kit/commit/7bd1b5b15ba2a444bd9e746fb36236030919b273), [`b80958f`](https://github.com/nodejs/doc-kit/commit/b80958ff53dd2388d33ce8ed282b14a67d3374f0), [`d3306a2`](https://github.com/nodejs/doc-kit/commit/d3306a20bf913d2c83739215bc5692434ceef166), [`c334823`](https://github.com/nodejs/doc-kit/commit/c334823a1ee7c1dc4642fa1b0dad90912de22f17), [`68751af`](https://github.com/nodejs/doc-kit/commit/68751af17a45cc0c8e76d36308fb1be3f1dec4af), [`c734403`](https://github.com/nodejs/doc-kit/commit/c7344034d83dd5858250a5cc386fbe729f07ede0), [`70b7526`](https://github.com/nodejs/doc-kit/commit/70b75269e9d0ed6b199c217bb268de96e65645c9), [`c334823`](https://github.com/nodejs/doc-kit/commit/c334823a1ee7c1dc4642fa1b0dad90912de22f17), [`ada6540`](https://github.com/nodejs/doc-kit/commit/ada6540fe6c2c32cfa254187c159941b245ebf80), [`740b613`](https://github.com/nodejs/doc-kit/commit/740b613ded7326eada843c34809ea128c6a9d7b5), [`ca36039`](https://github.com/nodejs/doc-kit/commit/ca3603916bee58fb80c1ea3a2e0023c13903fc63), [`9ab2840`](https://github.com/nodejs/doc-kit/commit/9ab2840559d2f04a6db6b29bbf6c6d470a1dde0b), [`b73b704`](https://github.com/nodejs/doc-kit/commit/b73b70474a2c499c1be315ebf2595e6932124e19), [`cef45ca`](https://github.com/nodejs/doc-kit/commit/cef45caf14cba83c77c373f59cee7f33f9f3df9b), [`0bd347d`](https://github.com/nodejs/doc-kit/commit/0bd347da847e21c2501732c0acbdee7db1b0f8f1), [`e6f1769`](https://github.com/nodejs/doc-kit/commit/e6f176958f6323d054dc86c4437accc9340e6914), [`d0f0de0`](https://github.com/nodejs/doc-kit/commit/d0f0de069e9061b6684269b412029bdd3dd288ba), [`2f9defe`](https://github.com/nodejs/doc-kit/commit/2f9defe49cac2d0e95c6fb213075291509a50a5f), [`43a09f7`](https://github.com/nodejs/doc-kit/commit/43a09f7ae9cdd4a1863e98b067abcf104e8937f2), [`b80958f`](https://github.com/nodejs/doc-kit/commit/b80958ff53dd2388d33ce8ed282b14a67d3374f0)]:
  - @nodejs/doc-kit@1.0.0
