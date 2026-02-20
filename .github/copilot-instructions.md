# Copilot Instructions for Avocado

## Project Overview

Avocado (**A**nother **V**alidator **o**f **O**penAPI spec repository **C**onfiguration **A**nd **D**irect**o**ries) is a Node.js CLI tool and library that validates the folder structure and configuration of Azure OpenAPI specification repositories (e.g. `Azure/azure-rest-api-specs`). It is published as `@azure/avocado` on npm.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Module system**: ESM (`"type": "module"` in `package.json`). Use `.js` extensions in relative import paths (e.g. `import * as err from './errors.js'`).
- **Runtime**: Node.js >= 20
- **Build**: `tsc` (TypeScript compiler). Output goes to `dist/`.
- **Test framework**: Vitest. Test files live in `src/test/` and use the naming pattern `*-test.ts` (not `*.test.ts`).
- **Linter**: ESLint (flat config in `eslint.config.js`)
- **Formatter**: Prettier (config in `.prettierrc`) — no semicolons, single quotes, 120 char print width, trailing commas

## Common Commands

- **Install dependencies**: `npm ci`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Check formatting**: `npm run format:check`
- **Auto-format**: `npm run format`
- **Run tests**: `npm test` (watch mode) or `npm run test:ci` (single run with coverage)

## Coding Conventions

- Source files use the copyright header: `// Copyright (c) Microsoft Corporation. All rights reserved.` followed by `// Licensed under the MIT License. See LICENSE in the project root for license information.`
- Use `import * as name from 'module'` style for namespace imports. Named imports are also used where appropriate.
- Prefer `readonly` properties in type definitions and interfaces.
- Error types are defined as discriminated unions in `src/errors.ts` using a `code` field.
- Async iteration is used extensively via `@ts-common/async-iterator` (`asyncIt`) for streaming validation results.
- Synchronous iteration helpers come from `@ts-common/iterator`.
- Tests use `assert.deepStrictEqual` for comparisons and `describe`/`it` from Vitest.
- Test fixtures are subdirectories within `src/test/` containing sample `readme.md` and JSON spec files.

## Project Structure

```
src/           – TypeScript source files
src/test/      – Test files (*-test.ts) and test fixture directories
bin/cli.js     – CLI entry point
dist/          – Compiled output (git-ignored)
```

Key source files:
- `src/index.ts` – Main validation logic and public API
- `src/errors.ts` – Error type definitions
- `src/cli.ts` – CLI runner/reporting utilities (yargs setup lives in `bin/cli.js`)
- `src/dev-ops.ts` – Azure DevOps PR integration
- `src/git.ts` – Git operations
- `src/readme.ts` – Readme/markdown parsing utilities
- `src/docs.ts` – Swagger file listing for docs pipeline

## PR and CI Guidelines

- CI runs on GitHub Actions (`.github/workflows/test.yaml`) on both Ubuntu and Windows with Node 20 and 24.
- CI steps: install → build → lint → format check → test with coverage.
- All PRs should pass lint, format check, and tests before merging.
- Update `CHANGELOG.md` when making user-facing changes.
