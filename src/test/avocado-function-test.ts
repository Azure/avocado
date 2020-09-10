// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as avocado from '../index'
import * as assert from 'assert'
import { readFileSync } from 'fs'
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
    assert.deepStrictEqual(r, '')
    const r1 = avocado.getVersionFromInputFile('/test/json/2020-05-01-preview/b.json')
    assert.deepStrictEqual(r1, '2020-05-01-preview')
  })
})
