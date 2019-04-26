import { childProcess } from '../index'

describe('git', () => {
  it('exec', async () => {
    await childProcess.exec('node ./src/test/output-gen.js', {})
  })
})
