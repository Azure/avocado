import * as index from '../index'
import * as assert from 'assert'

describe('DFS validate', () => {
  it('moveTo', () => {
    const a = new Set<string>()
    a.add('1')
    a.add('2')
    a.add('3')
    const b = new Set<string>()
    index.moveTo(a, b, '1')
    assert.deepStrictEqual(a, new Set<string>(['2', '3']))
    assert.deepStrictEqual(b, new Set<string>(['1']))
  })

  it('validate no circular reference', async () => {
    const path = 'src/test/correct/specification/readme.md'
    const errors = await index.validateReadMeFile(path).toArray()
    assert.deepStrictEqual(errors.length, 0)
  })

  /**
   * Circular reference: a.json => b.json => c.json => a.json
   */
  it('validate simple circular reference', async () => {
    const path = 'src/test/circular_reference/specification/readme.md'
    const errors = await index.validateReadMeFile(path).toArray()

    assert.ok(errors.every(v => v.code === 'CIRCULAR_REFERENCE'))
    assert.strictEqual(errors.length, 1)
  })

  it('not autorest markdown', async () => {
    const path = 'src/test/not_autorest_markdown/specification/readme.md'
    const errors = await index.validateReadMeFile(path).toArray()
    assert.strictEqual(errors.length, 1)
    assert.strictEqual(errors[0].code, 'NOT_AUTOREST_MARKDOWN')
  })
})
