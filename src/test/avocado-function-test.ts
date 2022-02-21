// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as avocado from '../index'
import * as assert from 'assert'
import { readFileSync } from 'fs'
import * as path from 'path'
import * as md from '@ts-common/commonmark-to-markdown'

describe('avocado', () => {
  it('get default tag', () => {
    const readme = readFileSync('src/test/test-readmes/readme.md').toString()
    const m = md.parse(readme)
    const r = avocado.isContainsMultiVersion(m)
    assert.deepStrictEqual(r, false)
    const readme1 = readFileSync('src/test/test-readmes/readme1.md').toString()
    const m1 = md.parse(readme1)
    const r1 = avocado.isContainsMultiVersion(m1)
    assert.deepStrictEqual(r1, false)
  })

  it('get version from input-files ', () => {
    const r = avocado.getVersionFromInputFile('/test/json')
    assert.deepStrictEqual(r, undefined)
    const r2 = avocado.getVersionFromInputFile('json')
    assert.deepStrictEqual(r2, undefined)
    const r1 = avocado.getVersionFromInputFile('/test/json/2020-05-01-preview/b.json')
    assert.deepStrictEqual(r1, '2020-05-01-preview')
  })
})

describe('check default tag should contains all apiVersion', () => {
  const root = 'src/test/default_tag_latest_swaggers/specification/'
  it('check RP level folder securityinsights', () => {
    const rpFolder = path.join(root, 'securityinsights')
    const res = avocado.validateRPMustContainAllLatestApiVersionSwagger(rpFolder).toArray()
    assert.deepStrictEqual(res.length, 21)
    assert.deepStrictEqual(
      res.some(it => it.code === 'MISSING_APIS_IN_DEFAULT_TAG'),
      true,
    )
    assert.deepStrictEqual(
      res.some(it => it.code === 'NOT_LATEST_API_VERSION_IN_DEFAULT_TAG'),
      true,
    )
  })

  it('normalizeApiPath', () => {
    // tslint:disable-next-line: no-let
    let apiPath = '/subscriptions/{subscriptionId}/providers/Microsoft.Advisor/configurations/{configurationName}'
    // tslint:disable-next-line: no-let
    let ret = avocado.normalizeApiPath(apiPath)
    assert.deepStrictEqual(ret, '/subscriptions/{}/providers/Microsoft.Advisor/configurations/{}')

    apiPath = '/providers/Microsoft.Advisor/operations'
    ret = avocado.normalizeApiPath(apiPath)
    assert.deepStrictEqual(ret, '/providers/Microsoft.Advisor/operations')

    apiPath = '/{resourceUri}/providers/Microsoft.Advisor/recommendations/{recommendationId}/suppressions/{name}'
    ret = avocado.normalizeApiPath(apiPath)
    assert.deepStrictEqual(ret, '/{}/providers/Microsoft.Advisor/recommendations/{}/suppressions/{}')
  })
})
