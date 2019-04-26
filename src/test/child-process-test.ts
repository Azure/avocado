import { childProcess } from '../index'
import * as assert from 'assert'
import { generate } from './generate-output'

describe('git', () => {
  it('exec', async () => {
    const { stdout } = await childProcess.exec(
      'node -e "require(\'./dist/test/generate-output.js\').print()"',
      {}
    )
    const expected = generate().map(v => v + '\n').reduce((a, b) => a + b)
    assert.deepStrictEqual(expected, stdout)
  })
})
