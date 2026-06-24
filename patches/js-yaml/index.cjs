// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// Compatibility shim for js-yaml v3 API consumers (e.g. @azure/openapi-markdown, front-matter).
// These packages depend on `js-yaml ^3.x` and use the v3-only `safeLoad`/`safeDump` API names,
// which were removed in js-yaml v4. This shim delegates to js-yaml@4.2.0 (which fixes
// CVE-2026-53550 / GHSA-h67p-54hq-rp68) and re-adds the deprecated aliases so existing
// callers continue to work without modification.
'use strict'
const yaml = require('js-yaml-v4')

module.exports = Object.assign({}, yaml, {
  // v3 backward-compat aliases (safeLoad == load, safeDump == dump, etc. in v3)
  safeLoad: yaml.load,
  safeLoadAll: yaml.loadAll,
  safeDump: yaml.dump,
})
