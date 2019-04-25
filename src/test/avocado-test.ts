import * as avocado from '../index'
import assert from 'assert'
import * as path from 'path'

describe('avocado', () => {
  it('not autorest markdown', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/not_autorest_markdown', env: {} }).toArray()
    const expected: unknown = [
      {
        code: 'NOT_AUTOREST_MARKDOWN',
        message: 'The `readme.md` is not AutoRest markdown file.',
        readMeUrl: path.resolve('src/test/not_autorest_markdown/specification/readme.md'),
        helpUrl:
          // tslint:disable-next-line:max-line-length
          'http://azure.github.io/autorest/user/literate-file-formats/configuration.html#the-file-format'
      }
    ]
    assert.deepStrictEqual(r, expected)
  })

  it('no file found', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/no_file_found', env: {} }).toArray()
    const r0 = r[0]
    if (r0.code === 'JSON_PARSE') {
      throw new Error('r0.code === "JSON_PARSE"')
    }
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: 'NO_JSON_FILE_FOUND',
        message: r0.message,
        readMeUrl: path.resolve('src/test/no_file_found/specification/readme.md'),
        jsonUrl: path.resolve('src/test/no_file_found/specification/specs/some.json')
      }
    ]
    assert.deepStrictEqual(r, e)
  })

  it('unreferenced file', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/unreferenced_file', env: {} }).toArray()
    const r0 = r[0]
    if (r0.code === 'JSON_PARSE') {
      throw new Error('r0.code === "JSON_PARSE"')
    }
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: r0.message,
        readMeUrl: path.resolve('src/test/unreferenced_file/specification/readme.md'),
        jsonUrl: path.resolve('src/test/unreferenced_file/specification/specs/some.json')
      }
    ]
    assert.deepStrictEqual(r, e)
  })

  it('invalid JSON', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/invalid_json', env: {} }).toArray()
    assert.deepStrictEqual(r, [
      {
        code: 'JSON_PARSE',
        message: 'The file is not valid JSON file.',
        error: {
          code: 'unexpected token',
          kind: 'structure',
          message: 'unexpected token, token: }, line: 3, column: 1',
          position: {
            column: 1,
            line: 3
          },
          token: '}',
          url: path.resolve('src/test/invalid_json/specification/specs/some.json')
        }
      }
    ])
  })

  it('invalid ref', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/invalid_ref', env: {} }).toArray()
    // tslint:disable-next-line:prettier
    const expected: readonly avocado.Error[] = [
      {
        code: 'NO_JSON_FILE_FOUND',
        message: r[0].message,
        jsonUrl: path.resolve('src/test/invalid_ref/specification/specs/a.json'),
        readMeUrl: path.resolve('src/test/invalid_ref/specification/readme.md')
      }
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('backslash', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/backslash', env: {} }).toArray()
    const expected: unknown = []
    assert.deepStrictEqual(r, expected)
  })
})
