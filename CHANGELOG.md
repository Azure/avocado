# Changelog

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
