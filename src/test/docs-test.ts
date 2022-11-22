import { IService } from './../../dist/docs.d'
// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as docs from '../docs'
import * as assert from 'assert'

describe('docs test ExpandSourceSwaggerFile', () => {
  it('Test ExpandSourceSwaggerFile for signalR service. one swagger file', () => {
    const readmePath = 'src/test/readmes/signalr.md'
    const rootPath = '.'
    let source = 'src/test/readmes/Microsoft.SignalRService/stable/[stable_version]/signalr.json'

    let res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    assert.strictEqual(res.length, 1)
    assert.strictEqual(
      res[0].swagger_file.source,
      'src/test/readmes/Microsoft.SignalRService/stable/2022-02-01/signalr.json',
    )

    source = 'src/test/readmes/Microsoft.SignalRService/stable/[stable_version]/*.json'
    res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    assert.strictEqual(res.length, 1)
    assert.strictEqual(
      res[0].swagger_file.source,
      'src/test/readmes/Microsoft.SignalRService/stable/2022-02-01/signalr.json',
    )

    source = 'src/test/readmes/Microsoft.SignalRService/preview/[preview_version]/signalr.json'
    res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    assert.strictEqual(res.length, 1)
    assert.strictEqual(
      res[0].swagger_file.source,
      'src/test/readmes/Microsoft.SignalRService/preview/2022-08-01-preview/signalr.json',
    )

    source = 'src/test/readmes/Microsoft.SignalRService/[preview_version]/*.json'
    res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    assert.strictEqual(res.length, 1)
    assert.strictEqual(
      res[0].swagger_file.source,
      'src/test/readmes/Microsoft.SignalRService/preview/2022-08-01-preview/signalr.json',
    )

    // The default tag is preview version
    source = 'src/test/readmes/Microsoft.SignalRService/[version]/*.json'
    res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    assert.strictEqual(res.length, 1)
    assert.strictEqual(
      res[0].swagger_file.source,
      'src/test/readmes/Microsoft.SignalRService/preview/2022-08-01-preview/signalr.json',
    )
  })

  it('Test ExpandSourceSwaggerFile for cognitive language service. multi swagger files', () => {
    const readmePath = 'src/test/readmes/cognitiveservice-language.md'
    const rootPath = '.'
    let source = 'src/test/readmes/[preview_version]/*.json'
    let res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)
    let expected = [
      'src/test/readmes/preview/2022-10-01-preview/analyzetext.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzetext-authoring.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzeconversations.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzeconversations-authoring.json',
      'src/test/readmes/preview/2022-10-01-preview/questionanswering.json',
      'src/test/readmes/preview/2022-10-01-preview/questionanswering-authoring.json',
    ]
    assert.strictEqual(
      res
        .map(r => r.swagger_file.source)
        .sort()
        .join(','),
      expected.sort().join(','),
    )

    source = 'src/test/readmes/[stable_version]/*.json'
    res = docs.expandSourceSwaggerFiles(rootPath, readmePath, source)

    expected = [
      'src/test/readmes/stable/2022-05-01/analyzetext.json',
      'src/test/readmes/stable/2022-05-01/analyzetext-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations.json',
    ]
    assert.strictEqual(
      res
        .map(r => r.swagger_file.source)
        .sort()
        .join(','),
      expected.sort().join(','),
    )
  })
})

describe('docs test getSwaggerFiles', () => {
  it('Test getSwaggerFiles for signalR service [stable_version]. ', () => {
    const readmePath = 'src/test/readmes/signalr.md'

    const signalRService: IService = {
      readme_files: [readmePath],
      swagger_files: [{ source: 'src/test/readmes/Microsoft.SignalRService/[stable_version]/*.json' }],
    }
    const rootPath = '.'
    const res = docs.getSwaggerFiles(rootPath, signalRService)
    const expected = [
      {
        source: 'src/test/readmes/signalr.md',
        swagger_file: {
          source: 'src/test/readmes/Microsoft.SignalRService/preview/2022-08-01-preview/signalr.json',
        },
      },
      {
        source: 'src/test/readmes/Microsoft.SignalRService/[stable_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/Microsoft.SignalRService/stable/2022-02-01/signalr.json',
        },
      },
    ]
    assert.deepStrictEqual(res, expected)
  })

  it('Test getSwaggerFiles for cognitive language service. ', () => {
    const readmePath = 'src/test/readmes/cognitiveservice-language.md'
    const cognitiveService: IService = {
      readme_files: [readmePath],
      swagger_files: [
        { source: 'src/test/readmes/[preview_version]/*.json' },
        { source: 'src/test/readmes/[stable_version]/*.json' },
      ],
    }
    const rootPath = '.'
    const res = docs.getSwaggerFiles(rootPath, cognitiveService)
    const expected = [
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzetext.json',
        },
      },
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzetext-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzeconversations.json',
        },
      },
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzeconversations-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/questionanswering.json',
        },
      },
      {
        source: 'src/test/readmes/cognitiveservice-language.md',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/questionanswering-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzetext.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzetext-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzeconversations.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/analyzeconversations-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/questionanswering.json',
        },
      },
      {
        source: 'src/test/readmes/[preview_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/preview/2022-10-01-preview/questionanswering-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[stable_version]/*.json',
        swagger_file: { source: 'src/test/readmes/stable/2022-05-01/analyzetext.json' },
      },
      {
        source: 'src/test/readmes/[stable_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/stable/2022-05-01/analyzetext-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[stable_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/stable/2022-05-01/analyzeconversations-authoring.json',
        },
      },
      {
        source: 'src/test/readmes/[stable_version]/*.json',
        swagger_file: {
          source: 'src/test/readmes/stable/2022-05-01/analyzeconversations.json',
        },
      },
    ]
    assert.deepStrictEqual(res, expected)
  })
})
