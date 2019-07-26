// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as avocado from '../index'
import * as assert from 'assert'
import * as path from 'path'
import * as error from '../errors'

describe('avocado', () => {
  it('not autorest markdown', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/not_autorest_markdown', env: {} }).toArray()
    const expected = [
      {
        code: 'NOT_AUTOREST_MARKDOWN',
        message: 'The `readme.md` is not AutoRest markdown file.',
        readMeUrl: path.resolve('src/test/not_autorest_markdown/specification/readme.md'),
        helpUrl:
          // tslint:disable-next-line:max-line-length
          'http://azure.github.io/autorest/user/literate-file-formats/configuration.html#the-file-format',
      },
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('no file found', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/no_file_found', env: {} }).toArray()
    const r0 = r[0]
    if (r0.code === 'JSON_PARSE') {
      assert.fail()
    }
    const e = [
      {
        code: 'NO_JSON_FILE_FOUND',
        message: r0.message,
        readMeUrl: path.resolve('src/test/no_file_found/specification/readme.md'),
        jsonUrl: path.resolve('src/test/no_file_found/specification/specs/some.json'),
      },
    ] as const
    assert.deepStrictEqual(r, e)
  })

  it('unreferenced example file', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/unreferenced_example', env: {} }).toArray()
    const e: ReadonlyArray<error.Error> = [
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The example JSON file is not referenced from the swagger file.',
        readMeUrl: path.resolve('src/test/unreferenced_example/specification/readme.md'),
        jsonUrl: path.resolve('src/test/unreferenced_example/specification/specs/examples/orphan_example.json'),
      },
    ]
    assert.deepStrictEqual(r, e)
  })

  it('unreferenced spec file', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/unreferenced_spec', env: {} }).toArray()
    const e = [
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The swagger JSON file is not referenced from the readme file.',
        readMeUrl: path.resolve('src/test/unreferenced_spec/specification/readme.md'),
        jsonUrl: path.resolve('src/test/unreferenced_spec/specification/specs/some.json'),
      },
    ] as const
    assert.deepStrictEqual(r, e)
  })

  it('unreferenced spec file with referenced examples', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/unreferenced_spec_with_examples', env: {} }).toArray()
    const e = [
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The example JSON file is not referenced from the swagger file.',
        readMeUrl: path.resolve('src/test/unreferenced_spec_with_examples/specification/readme.md'),
        jsonUrl: path.resolve(
          // tslint:disable-next-line:max-line-length
          'src/test/unreferenced_spec_with_examples/specification/specs/examples/referenced_example.json',
        ),
      },
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The swagger JSON file is not referenced from the readme file.',
        readMeUrl: path.resolve('src/test/unreferenced_spec_with_examples/specification/readme.md'),
        jsonUrl: path.resolve('src/test/unreferenced_spec_with_examples/specification/specs/orphan_spec.json'),
      },
    ] as const

    assert.deepStrictEqual(r, e)
  })

  it('invalid JSON', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/invalid_json_trailing_comma', env: {} }).toArray()
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
            line: 3,
          },
          token: '}',
          url: path.resolve('src/test/invalid_json_trailing_comma/specification/specs/some.json'),
        },
      },
    ])
  })

  it('invalid JSON with BOM', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/invalid_json_with_bom', env: {} }).toArray()
    assert.deepStrictEqual(r, [
      {
        code: 'JSON_PARSE',
        message: 'The file is not valid JSON file.',
        error: {
          code: 'invalid symbol',
          kind: 'syntax',
          message: 'invalid symbol, token: \uFEFF, line: 1, column: 1',
          position: {
            column: 1,
            line: 1,
          },
          token: '\uFEFF',
          url: path.resolve('src/test/invalid_json_with_bom/specification/specs/some.json'),
        },
      },
    ])
  })

  it('invalid ref', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/invalid_ref', env: {} }).toArray()
    const expected = [
      {
        code: 'NO_JSON_FILE_FOUND',
        message: r[0].message,
        jsonUrl: path.resolve('src/test/invalid_ref/specification/specs/a.json'),
        readMeUrl: path.resolve('src/test/invalid_ref/specification/readme.md'),
      },
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('backslash', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/backslash', env: {} }).toArray()
    const expected = [] as const
    assert.deepStrictEqual(r, expected)
  })

  it('diamond dependencies', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/diamond_dependencies', env: {} }).toArray()
    // we expect only one error for `common.json` even if the file is referenced multiple times.
    const expected = [
      {
        code: 'JSON_PARSE',
        error: {
          code: 'unexpected end of file',
          kind: 'structure',
          message: 'unexpected end of file, token: , line: 1, column: 1',
          position: { column: 1, line: 1 },
          token: '',
          url: path.resolve('src/test/diamond_dependencies/specification/specs/common.json'),
        },
        message: 'The file is not valid JSON file.',
      },
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('circular reference', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/circular_reference', env: {} }).toArray()
    const expected = [
      {
        code: 'CIRCULAR_REFERENCE',
        message: 'The JSON file exist circular reference.',
        readMeUrl: path.resolve('src/test/circular_reference/specification/readme.md'),
        jsonUrl: path.resolve('src/test/circular_reference/specification/specs/c.json'),
      },
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('analyze globally', async () => {
    const r = await avocado.avocado({ cwd: 'src/test/referenced_common_spec', env: {} }).toArray()
    const expected = [
      {
        code: 'NO_JSON_FILE_FOUND',
        message: 'The JSON file is not found but it is referenced from the readme file.',
        readMeUrl: path.resolve('src/test/referenced_common_spec/specification/service/readme.md'),
        jsonUrl: path.resolve('src/test/referenced_common_spec/specification/common/specs/no_such_file.json'),
      },
      {
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The swagger JSON file is not referenced from the readme file.',
        readMeUrl: path.resolve('src/test/referenced_common_spec/specification/common/readme.md'),
        jsonUrl: path.resolve('src/test/referenced_common_spec/specification/common/specs/orphan.json'),
      },
    ] as const
    assert.deepStrictEqual(r, expected)
  })

  it('ignore example file $ref', async () => {
    // Test distinguish between example file and swagger file and ignore $ref in example file
    const r = await avocado.avocado({ cwd: 'src/test/example_file_ignored_reference', env: {} }).toArray()
    assert.strictEqual(r.length, 0)
  })
})
