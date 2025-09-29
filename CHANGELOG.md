# Changelog

## 0.10.3

- Bump `@azure/swagger-validation-common` from `0.0.5` to `0.1.2`
- Bump `@ts-common/async-iterator` from `0.2.3` to `^1.1.0`
- Bump `@ts-common/fs` to `0.2.0` to `^1.1.0`
- Bump `@ts-common/json` from `0.3.1` to `^1.1.0`
- Bump `@ts-common/json-parser` from `0.9.0` to `^1.1.0`
- Bump `@ts-common/string-map` from `0.3.0` to `^1.1.1`
- Bump `glob` from `^9.3.5` to `^11.0.3`
- Bump `node-object-hash` from `^1.4.2` to `^3.1.1`

## 0.10.2

- Revert `yargs` to `^15.4.1`

## 0.10.1

- Fix bug triggered by upgrade to `yargs` in 0.10.0

## 0.10.0

- Breaking Change: Requires Node 20 or higher
- Remove unused dependency `node-fetch`
- Remove unused dependency `node-notifier`
- Bump `yargs` from `^15.4.1` to `^18.0.0`
- Bump `js-yaml` from `^3.13.1` to `^4.1.0`
- Pin `@azure/openapi-markdown` to `0.9.4`
- Pin `@azure/swagger-validation-common` to `0.0.5`
- Pin `@ts-common/async-iterator` to `0.2.3`
- Pin `@ts-common/fs` to `0.2.0`
- Pin `@ts-common/json` to `0.3.1`
- Pin `@ts-common/json-parser` to `0.9.0`
- Pin `@ts-common/string-map` to `0.3.0`
- Pin `commonmark` to `0.31.2`

## 0.9.3

- Bump `glob` dependency to `^9.3.5`

## 0.9.2

- Change rule MULTIPLE_API_VERSION from warning to error level.

## 0.9.1

- Restore exported API `getDefaultTag()`, accidentally removed in 0.8.12

## 0.9.0

- Breaking Change: Requires Node 18 or higher
- Bump `jsonpath-plus` dependency to `^10.0.0`

## 0.8.14

- Filter out `only` suffix tag for getSwaggerFiles function
- Throw error when readme file not found

## 0.8.13

- Add rule INVALID_TYPESPEC_LOCATION to validate if TypeSpec file in 'resource-manager' or 'data-plane' folder.

## 0.8.12

- Add getSwaggerFiles for docs pipeline to get the latest swagger files and the stable swagger files.
- Make API path case insensitive in MISSING_APIS_IN_DEFAULT_TAG

## 0.8.11

- Fix `includePaths` parameter doesn't work on MISSING_README rule in DevOps.

## 0.8.10

- Clarify MISSING_APIS_IN_DEFAULT_TAG error message.

## 0.8.9

- Fix `path` variable in MISSING_APIS_IN_DEFAULT_TAG inconsistent with others.

## 0.8.8

- Add rule MULTIPLE_DEFAULT_TAGS to validate if there are multiple default tags.
- Add path in MISSING_APIS_IN_DEFAULT_TAG output.
- Add `includePaths` command line parameter.

## 0.8.7

- Ignore INCONSISTENT_API_VERSION in dev folder.

## 0.8.6

- Disable MISSING_APIS_IN_DEFAULT_TAG for data-plane apis.

## 0.8.5

- To make sure default tag contains the latest apiVersion swagger. Add two rules NOT_LATEST_API_VERSION_IN_DEFAULT_TAG and MISSING_APIS_IN_DEFAULT_TAG.

## 0.8.3

- Bug fix. avoid infinite loop. When find the nearest readme

## 0.8.2

- Fix bug. MISSING_README should be excluded by arguments.
- Fix security issue.

## 0.8.1

- fix unittest
- Support excludePaths option to ignore errors from common-type
- Fix bug. Check folder exist before run avocado

## 0.8.0

- Support folder level validation.
- Add rule INVALID_FILE_LOCATION to validate if management plane swagger in 'resource-manager' folder

## 0.7.2

- Add rule MULTIPLE_API_VERSION to validate if the default tag in readme.md contains multiple API version.

## 0.7.1

- upgrade ts-common/json-parser version

## 0.7.0

- Add detail log file report
- Use yargs for cli

## 0.6.4

- Add rule INCONSISTENT_API_VERSION to validate swagger api version must consistent with its file path.

## 0.6.3

- Add rule MISSING_README to validate each RP folder must have readme.md.
- Modify unit test.

## 0.6.2

- Support \$(this-folder)

## 0.6.1

- Update `Readme.md`.
- Add `package-lock.json`. restrict tslint version `~5.18.0`

## 0.6.0

- Add error level. Now support `Error` and `Warning` level.
- `Error`: Must be fixed, blocking CI process.
- `Warning`:Hints. Needn't be fixed, not blocking CI process.
- Circular reference is `Warning` level. Other errors are `Error` level.

## 0.5.1

- Distinguish between example and swagger, and ignore analyzing '\$ref' in example file.
- More specific error message about UNREFERENCED_JSON_FILE, see [issue 22](https://github.com/Azure/avocado/issues/22)

## 0.5.0

- Support circular reference detection for specs
- A test for circular reference
- Analyze globally. analyze references between different spec folder instead of only readme folder.

## 0.4.10

- Restructure `index.ts` move 'error' type to `errors.ts`
- code format

## 0.4.9

- Simplify structuralDiff and update packages.

## 0.4.8

- Replaced jsonStructuralDiff for structuralDiff.

## 0.4.7

- Add jsonStructuralDiff to PullRequestProperties.

## 0.4.6

- Git commands should never ask for credentials.

## 0.4.5

- A test for diamond dependencies.
- CI should test Node 12 instead of Node 11.
- `@types/js-yaml` is a dev dependency.

## 0.4.4

- Add `prettier` back but use it together with `standard`.
- `tslint` checks for almost all rules.
- Test coverage produces HTML files.

## 0.4.3

- Fix `exec` maxBuffer bug https://github.com/Azure/avocado/issues/27.

## 0.4.2

- restore test coverage
- use Jest instead of Mocha and Nyc
- use `tslint` and `tslint-config-standard` original rules instead of `prettier`

## 0.4.1

- `git` namespace.

## 0.4.0

- `devOps` and `cli` namespaces.

## 0.3.0

- Avocado can detect Azure Dev Ops PR validation and show only relevant errors.
