# `@nodejs/doc-kit` Contributing Guide

Thank you for your interest in contributing to the `@nodejs/doc-kit` project! We welcome contributions from everyone, and we appreciate your help in making this project better.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Development Workflow](#development-workflow)
  - [Making Changes](#making-changes)
  - [Submitting Your Changes](#submitting-your-changes)
- [Writing Tests](#writing-tests)
  - [Test File Organization](#test-file-organization)
  - [Writing Test Code](#writing-test-code)
    - [Use Node.js Built-in Test Runner](#use-nodejs-built-in-test-runner)
    - [Test Structure](#test-structure)
    - [Best Practices](#best-practices)
    - [Example Test File](#example-test-file)
  - [Running Tests](#running-tests)
- [Code Quality](#code-quality)
  - [Linting and Formatting](#linting-and-formatting)
  - [Pre-commit Hooks](#pre-commit-hooks)
- [Commit Guidelines](#commit-guidelines)
- [Developer's Certificate of Origin 1.1](#developers-certificate-of-origin-11)

## Getting Started

The steps below will give you a general idea of how to prepare your local environment for the `@nodejs/doc-kit` project and general steps for getting things done and landing your contribution.

### Prerequisites

- Node.js (latest LTS version, check the [`.nvmrc` file](/.nvmrc))
- [Git][]
- A GitHub account

### Setting Up Your Development Environment

1. **Fork the repository**

   Click the fork button in the top right, or the link in this paragraph, to clone the [Node.js `doc-kit` Repository](https://github.com/nodejs/doc-kit/fork)

2. **Clone your fork**

   ```bash
   git clone git@github.com:<YOUR_GITHUB_USERNAME>/doc-kit.git # SSH
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/doc-kit.git # HTTPS
   gh repo clone <YOUR_GITHUB_USERNAME>/doc-kit # GitHub CLI
   ```

3. **Navigate to the project directory**

   ```bash
   cd doc-kit
   ```

4. **Set up upstream remote**

   ```bash
   git remote add upstream git@github.com:nodejs/doc-kit # SSH
   git remote add upstream https://github.com/nodejs/doc-kit # HTTPS
   gh repo sync nodejs/doc-kit # GitHub CLI
   ```

5. **Install dependencies**

   ```bash
   npm install
   ```

## Development Workflow

### Making Changes

1. **Create a new branch for your work**

   ```bash
   git checkout -b <name-of-your-branch>
   ```

2. **Perform your changes**

   Make your code changes, add features, fix bugs, or improve documentation.

3. **Keep your branch up-to-date**

   ```bash
   git fetch upstream
   git merge upstream/main
   ```

4. **Test your changes**

   ```bash
   node --run test
   node --run test:coverage # To check code coverage
   ```

5. **Check code quality**

   ```bash
   node --run format
   node --run lint
   ```

### Submitting Your Changes

1. **Add and commit your changes**

   ```bash
   git add .
   git commit -m "describe your changes"
   ```

2. **Push to your fork**

   ```bash
   git push -u origin <name-of-your-branch>
   ```

3. **Create a Pull Request**

   Go to your fork on GitHub and create a Pull Request to the main repository.

> [!IMPORTANT]
> Before committing and opening a Pull Request, please go through our [Commit Guidelines](#commit-guidelines) and ensure your code passes all tests and quality checks.

## Writing Tests

Testing is a crucial part of maintaining code quality and ensuring reliability. All contributions should include appropriate tests.

### Test Coverage

- **Patches (PRs) are required to maintain 80% coverage minimum**
- **Contributors are encouraged to strive for 95-100% coverage**
- New features and bug fixes should include corresponding tests
- Tests should cover both happy path and edge cases

### Test File Organization

Tests should be organized to mirror the source code structure:

- For a source file at `/src/index.mjs`, create a test file at `/src/__tests__/index.test.mjs`
- For a source file at `/src/utils/parser.mjs`, create a test file at `/src/utils/__tests__/parser.test.mjs`
- Test files should use the `.test.mjs` extension

- For a fixture used in `/src/__tests__/some.test.mjs`, place the fixture at `/src/__tests__/fixtures/some-fixture.mjs`.
- When fixtures are used in multiple tests, place them in the test directory of the closest shared ancestor. For instance, if a fixture is used by both `/src/__tests__/some.test.mjs`, and `/src/utils/__tests__/parser.test.mjs`, the fixture belongs in `/src/__tests__/fixtures/`.

### Writing Test Code

Tests should follow these guidelines:

#### Use Node.js Built-in Test Runner

```javascript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
```

#### Test Structure

Use `describe` and `it` syntax for organizing tests:

```javascript
describe('MyModule', () => {
  describe('myFunction', () => {
    it('should return expected result for valid input', () => {
      // Test implementation
      assert.strictEqual(actual, expected);
    });

    it('should throw error for invalid input', () => {
      assert.throws(() => {
        // Code that should throw
      });
    });
  });
});
```

#### Best Practices

- **Use strict assertions**: Always use `node:assert/strict` over `node:assert`.
- **Focused testing**: Tests should ideally only test the specific file they are intended for
- **Use mocking**: Mock external dependencies to isolate the code under test
- **Code splitting**: Encourage breaking down complex functionality for easier testing

#### Example Test File

```javascript
// tests/index.test.mjs
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { myFunction } from '../index.mjs';

describe('index.mjs', () => {
  describe('myFunction', () => {
    it('should process valid input correctly', () => {
      const input = 'test input';
      const result = myFunction(input);
      assert.strictEqual(result, 'expected output');
    });

    it('should handle edge cases', () => {
      assert.strictEqual(myFunction(''), '');
      assert.strictEqual(myFunction(null), null);
    });

    it('should throw for invalid input', () => {
      assert.throws(() => myFunction(undefined), {
        name: 'TypeError',
        message: 'Input cannot be undefined',
      });
    });
  });
});
```

### Running Tests

```bash
# Run all tests
node --run test

# Run tests with coverage
node --run test:coverage

# Run specific test file
node --test src/test/index.test.mjs
```

## Code Quality

### Linting and Formatting

This project uses automated code quality tools:

```bash
# Format code
node --run format # To apply changes, use `format:write`

# Lint code
node --run lint # To apply changes, use `lint:fix`
```

### Pre-commit Hooks

This project uses [Husky][] for Git pre-commit hooks that automatically lint and format your code before committing.

You can bypass pre-commit hooks if necessary (not recommended):

```bash
git commit -m "describe your changes" --no-verify
```

## Commit Guidelines

This project follows the [Conventional Commits][] specification.

## Developer's Certificate of Origin 1.1

```
By contributing to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to
  submit it under the open source license indicated in the file; or
- (b) The contribution is based upon previous work that, to the best of my knowledge,
  is covered under an appropriate open source license and I have the right under that
  license to submit that work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am permitted to submit under a
  different license), as indicated in the file; or
- (c) The contribution was provided directly to me by some other person who certified
  (a), (b) or (c) and I have not modified it.
- (d) I understand and agree that this project and the contribution are public and that
  a record of the contribution (including all personal information I submit with it,
  including my sign-off) is maintained indefinitely and may be redistributed consistent
  with this project or the open source license(s) involved.
```

[Conventional Commits]: https://www.conventionalcommits.org/
[Git]: https://git-scm.com/downloads
[Husky]: https://typicode.github.io/husky/
