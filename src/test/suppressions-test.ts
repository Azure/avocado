// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as assert from 'assert'
import * as path from 'path'
import { describe, it } from 'vitest'
import { isAvocadoPathSuppressed } from '../avocado-suppressions.js'
import { getSuppressionsFromYaml } from '../suppressions.js'

describe('Swagger suppressions', () => {
  it('matches both Avocado and shared Swagger suppression names', () => {
    const suppressionsFile = path.resolve('specification/contoso/suppressions.yaml')
    const swaggerPath = path.resolve('specification/contoso/stable/one.json')
    const yaml = `
- tool: SwaggerAvocado
  path: stable/**
  reason: Avocado-specific suppression
- tool: SwaggerAll
  path: stable/one.json
  reason: Shared Swagger suppression
`

    assert.strictEqual(getSuppressionsFromYaml('SwaggerAvocado', swaggerPath, suppressionsFile, yaml).length, 1)
    assert.strictEqual(getSuppressionsFromYaml('SwaggerAll', swaggerPath, suppressionsFile, yaml).length, 1)
  })

  it('evaluates conditional suppressions', () => {
    const suppressions = getSuppressionsFromYaml(
      'SwaggerAvocado',
      path.resolve('specification/contoso/stable/one.json'),
      path.resolve('specification/contoso/suppressions.yaml'),
      `
- tool: SwaggerAvocado
  path: stable/**
  if: enabled
  reason: Conditional suppression
`,
      { enabled: true },
    )

    assert.strictEqual(suppressions.length, 1)
  })

  it('suppresses paths for SwaggerAll', async () => {
    const targetPath = path.resolve('src/test/suppressed_directory/specification/testRP/specs/some.json')
    assert.strictEqual(await isAvocadoPathSuppressed(targetPath), true)
  })

  it('does not suppress entire paths for rule-scoped suppressions', async () => {
    const targetPath = path.resolve('src/test/scoped_suppression/specification/testRP/specs/some.json')
    assert.strictEqual(await isAvocadoPathSuppressed(targetPath), false)
  })
})
