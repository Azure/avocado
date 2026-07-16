# Vendored patches

## `js-yaml` compatibility shim (`patches/js-yaml/` + `patches/js-yaml-5.2.0.tgz`)

`@azure/openapi-markdown` and `front-matter` both depend on `js-yaml@^3.x` and use the
v3-only `safeLoad` / `safeDump` API. `js-yaml@3.14.2` is affected by a quadratic-complexity
denial-of-service in merge-key handling (CVE-2026-53550 / GHSA-h67p-54hq-rp68), which is only
fixed in `js-yaml@4.2.0`+ — versions that removed `safeLoad` / `safeDump`.

This directory contains a tiny compatibility shim (`js-yaml@5.2.0`) that delegates to the
patched upstream `js-yaml@5.2.0` (installed as the `js-yaml-upstream` alias) and re-adds the
removed `safeLoad` / `safeDump` aliases so the two transitive consumers keep working:

```js
const yaml = require('js-yaml-upstream')
module.exports = Object.assign({}, yaml, {
  safeLoad: yaml.load,
  safeLoadAll: yaml.loadAll,
  safeDump: yaml.dump,
})
```

The shim is wired in via scoped `overrides` in the root `package.json`, so only the transitive
`js-yaml` inside `@azure/openapi-markdown` and `front-matter` is replaced — the direct
`js-yaml` dependency stays on the registry `^5.2.0` release. The override points at the packed
tarball (`patches/js-yaml-5.2.0.tgz`) rather than the source directory because npm installs
`file:` tarball dependencies (copying them and resolving their own dependencies) instead of
symlinking `file:` directories, which is required for the shim's `js-yaml-upstream` dependency
to resolve correctly under each consumer.

### Regenerating the tarball

After editing `patches/js-yaml/package.json` or `patches/js-yaml/index.cjs`, repack and
refresh the lock file:

```sh
cd patches/js-yaml && npm pack --pack-destination ../
cd ../.. && rm -rf node_modules package-lock.json && npm install
```
