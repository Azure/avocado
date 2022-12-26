// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as docs from '../docs'
import * as assert from 'assert'

describe('docs test getSwaggerFiles', () => {
  it('Test getSwaggerFiles for signalR service ', () => {
    const readmePath = 'src/test/readmes/signalr.md'
    const rootPath = '.'

    const service: docs.IService = {
      exclude_files: [],
      readme_files: [readmePath],
    }
    const res = docs.getSwaggerFiles(rootPath, service)

    assert.deepStrictEqual(res.latest, [
      'src/test/readmes/Microsoft.SignalRService/preview/2022-08-01-preview/signalr.json',
    ])

    assert.deepStrictEqual(res.stable, ['src/test/readmes/Microsoft.SignalRService/stable/2022-02-01/signalr.json'])
  })

  it('Test getSwaggerFiles for cognitive language service. ', () => {
    const readmePath = 'src/test/readmes/cognitiveservice-language.md'
    const cognitiveService: docs.IService = {
      readme_files: [readmePath],
      exclude_files: [],
    }
    const rootPath = '.'
    const res = docs.getSwaggerFiles(rootPath, cognitiveService)

    assert.deepStrictEqual(res.latest, [
      'src/test/readmes/preview/2022-10-01-preview/analyzetext.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzetext-authoring.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzeconversations.json',
      'src/test/readmes/preview/2022-10-01-preview/analyzeconversations-authoring.json',
      'src/test/readmes/preview/2022-10-01-preview/questionanswering.json',
      'src/test/readmes/preview/2022-10-01-preview/questionanswering-authoring.json',
    ])

    assert.deepStrictEqual(res.stable, [
      'src/test/readmes/stable/2022-05-01/analyzetext.json',
      'src/test/readmes/stable/2022-05-01/analyzetext-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations.json',
    ])

    // tslint:disable-next-line: no-object-mutation
    cognitiveService.exclude_files = ['src/test/readmes/stable/2022-05-01/analyzetext.json']
    // test excluded files
    const resWithExcluded = docs.getSwaggerFiles(rootPath, cognitiveService)
    assert.deepStrictEqual(resWithExcluded.latest, [
      'src/test/readmes/stable/2022-05-01/analyzetext-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations-authoring.json',
      'src/test/readmes/stable/2022-05-01/analyzeconversations.json',
    ])
  })

  it('Test getSwaggerFiles for azure kusto.', () => {
    const readmePath = 'src/test/readmes/azure-kusto.md'
    const cognitiveService: docs.IService = {
      readme_files: [readmePath],
      exclude_files: [],
    }

    const rootPath = '.'
    const res = docs.getSwaggerFiles(rootPath, cognitiveService)
    assert.deepStrictEqual(res.latest, ['src/test/readmes/Microsoft.Kusto/stable/2022-07-07/kusto.json'])

    assert.deepStrictEqual(res.stable, ['src/test/readmes/Microsoft.Kusto/stable/2022-07-07/kusto.json'])
  })
})
