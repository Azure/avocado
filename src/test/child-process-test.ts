// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { childProcess } from '../index'
import * as assert from 'assert'
import { generate } from './generate-output'

describe('child-process', () => {
  it('exec', async () => {
    const { stdout } = await childProcess.exec(
      'node -e "require(\'./dist/test/generate-output.js\').print()"',
      {}
    )
    const expected = generate().map(v => v + '\n').reduce((a, b) => a + b)
    assert.deepStrictEqual(expected, stdout)
  })
})
