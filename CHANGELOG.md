# Changelog

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