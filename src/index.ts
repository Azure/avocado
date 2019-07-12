// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path'
import * as fs from '@ts-common/fs'
import * as md from '@ts-common/commonmark-to-markdown'
import * as openApiMd from '@azure/openapi-markdown'
import * as asyncIt from '@ts-common/async-iterator'
import * as jsonParser from '@ts-common/json-parser'
import * as it from '@ts-common/iterator'
import * as json from '@ts-common/json'
import * as stringMap from '@ts-common/string-map'
import * as commonmark from 'commonmark'
import * as cli from './cli'
import * as git from './git'
import * as childProcess from './child-process'
// tslint:disable-next-line:no-require-imports
import nodeObjectHash = require('node-object-hash')
import * as devOps from './dev-ops'
import * as err from './errors'

export { devOps, cli, git, childProcess }

const errorCorrelationId = (error: err.Error) => {
  const toObject = () => {
    // tslint:disable-next-line:switch-default
    switch (error.code) {
      case 'UNREFERENCED_JSON_FILE':
        return { code: error.code, url: error.jsonUrl }
      case 'NO_JSON_FILE_FOUND':
        return { code: error.code, url: error.readMeUrl }
      case 'NOT_AUTOREST_MARKDOWN':
        return { code: error.code, url: error.readMeUrl }
      case 'JSON_PARSE':
        return {
          code: error.code,
          url: error.error.url,
          position: error.error.position,
        }
      case 'CIRCULAR_REFERENCE': {
        return {
          code: error.code,
          url: error.jsonUrl,
        }
      }
    }
  }

  return nodeObjectHash().hash(toObject())
}

const markDownIterate = (node: commonmark.Node | null) =>
  it.iterable(function*() {
    // tslint:disable-next-line:no-let
    let i = node
    while (i !== null) {
      yield i
      i = i.next
    }
  })

const isAutoRestMd = (m: md.MarkDownEx) =>
  markDownIterate(m.markDown.firstChild).some(v => {
    if (v.type !== 'block_quote') {
      return false
    }
    const p = v.firstChild
    if (p === null || p.type !== 'paragraph') {
      return false
    }
    const t = p.firstChild
    if (t === null || t.type !== 'text') {
      return false
    }
    return t.literal === 'see https://aka.ms/autorest'
  })

const jsonParse = (fileName: string, file: string) => {
  // tslint:disable-next-line:readonly-array
  const errors: err.Error[] = []
  const reportError = (e: jsonParser.ParseError) =>
    errors.push({ code: 'JSON_PARSE', message: 'The file is not valid JSON file.', error: e })
  const document = jsonParser.parse(fileName, file.toString(), reportError)
  return {
    errors,
    document,
  }
}

const getRefs = (j: json.Json): it.IterableEx<string> => {
  if (json.isObject(j)) {
    return stringMap
      .entries(j)
      .flatMap(([k, v]) => (k === '$ref' && typeof v === 'string' ? it.concat([v]) : getRefs(v)))
  } else if (it.isArray(j)) {
    return it.flatMap(j, getRefs)
  } else {
    return it.empty()
  }
}

type Ref = {
  /**
   * URL of JSON document.
   */
  readonly url: string
  /**
   * JSON pointer.
   */
  readonly pointer: string
}

const parseRef = (ref: string): Ref => {
  const i = ref.indexOf('#')
  return i < 0 ? { url: ref, pointer: '' } : { url: ref.substr(0, i), pointer: ref.substr(i + 1) }
}

const getReferencedFileNames = (fileName: string, doc: json.Json) => {
  const dir = path.dirname(fileName)
  return getRefs(doc)
    .map(v => parseRef(v).url)
    .filter(u => u !== '')
    .map(u => path.resolve(path.join(dir, u)))
}

export const moveTo = (a: Set<string>, b: Set<string>, key: string): string => {
  b.add(key)
  a.delete(key)
  return key
}

/**
 * The function will validate file reference as a directed graph and will detect circular reference.
 * Detect circular reference in a directed graph using colors.
 *
 * + WHITE: Vertex is not precessed yet. Initially all files mentioned in 'readme.md' is in `whiteSet`.
 * + GRAY:  Vertex is being processed (DFS for this vertex has started, but not finished which means that
 * all descendants (ind DFS tree) of this vertex are not processed yet (or this vertex is in function call stack)
 * + BLACK: Vertex and all its descendants are processed
 *
 * For more detail: https://www.geeksforgeeks.org/detect-cycle-direct-graph-using-colors/
 *
 * @param current current file path
 * @param readMePath current readme.md
 * @param whiteSet files set which haven't been explored yet
 * @param graySet files currently being explored
 * @param blackSet files have been explored
 */
export const DFSTraversalValidate = (
  current: string,
  readMePath: string,
  whiteSet: Set<string>,
  graySet: Set<string>,
  blackSet: Set<string>,
  inputFileSet: Set<string>,
): asyncIt.AsyncIterableEx<err.Error> =>
  asyncIt.iterable<err.Error>(async function*() {
    const fileName = moveTo(whiteSet, graySet, current)
    // tslint:disable-next-line:no-let
    let file

    // tslint:disable-next-line:no-try
    try {
      file = await fs.readFile(fileName)
    } catch (e) {
      yield {
        code: 'NO_JSON_FILE_FOUND',
        message: 'The JSON file is not found but it is referenced from the readme file.',
        readMeUrl: readMePath,
        jsonUrl: fileName,
      }
      return
    }
    const { errors, document } = jsonParse(fileName, file.toString())
    yield* errors
    const refFileNames = getReferencedFileNames(fileName, document)
    for (const refFileName of refFileNames) {
      inputFileSet.add(refFileName)
      if (graySet.has(refFileName)) {
        yield {
          code: 'CIRCULAR_REFERENCE',
          message: `The JSON exist circular reference`,
          readMeUrl: readMePath,
          jsonUrl: current,
        }
        moveTo(graySet, blackSet, refFileName)
      }

      if (!blackSet.has(refFileName)) {
        yield* DFSTraversalValidate(refFileName, readMePath, whiteSet, graySet, blackSet, inputFileSet)
      }
    }
    moveTo(graySet, blackSet, current)
  })

export const validateReadMeFile = (readMePath: string): asyncIt.AsyncIterableEx<err.Error> =>
  asyncIt.iterable<err.Error>(async function*() {
    const file = await fs.readFile(readMePath)
    const m = md.parse(file.toString())
    if (!isAutoRestMd(m)) {
      yield {
        code: 'NOT_AUTOREST_MARKDOWN',
        message: 'The `readme.md` is not AutoRest markdown file.',
        readMeUrl: readMePath,
        helpUrl:
          // tslint:disable-next-line:max-line-length
          'http://azure.github.io/autorest/user/literate-file-formats/configuration.html#the-file-format',
      }
    }

    const dir = path.dirname(readMePath)
    const inputFiles = openApiMd.getInputFiles(m.markDown).toArray()
    const inputFileSet = inputFiles
      .map(f => path.resolve(path.join(dir, ...f.split('\\'))))
      .reduce((s, v) => s.add(v), new Set<string>())

    const whiteSet = new Set<string>(inputFileSet)
    const graySet = new Set<string>()
    const blackSet = new Set<string>()

    while (whiteSet.size > 0) {
      const current = whiteSet.values().next().value
      yield* DFSTraversalValidate(current, readMePath, whiteSet, graySet, blackSet, inputFileSet)
    }
    yield* fs
      .recursiveReaddir(dir)
      .filter(filePath => path.extname(filePath) === '.json' && !inputFileSet.has(path.resolve(filePath)))
      .map<err.Error>(filePath => ({
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The JSON file is not referenced from the readme file.',
        readMeUrl: readMePath,
        jsonUrl: path.resolve(filePath),
      }))
  })

const validateSpecificationFolder = (cwd: string) =>
  asyncIt.iterable<err.Error>(async function*() {
    const specification = path.resolve(path.join(cwd, 'specification'))
    if (await fs.exists(specification)) {
      yield* fs
        .recursiveReaddir(specification)
        .filter(f => path.basename(f).toLowerCase() === 'readme.md')
        .flatMap(validateReadMeFile)
    }
  })

/**
 * Creates a map of unique errors for the given folder `cwd`.
 */
const avocadoForDir = async (cwd: string) => {
  const map = new Map<string, err.Error>()
  for await (const e of validateSpecificationFolder(cwd)) {
    map.set(errorCorrelationId(e), e)
  }

  return map
}

/**
 * Run Avocado in Azure DevOps for a Pull Request.
 *
 * @param pr Pull Request properties
 */
const avocadoForDevOps = (pr: devOps.PullRequestProperties): asyncIt.AsyncIterableEx<err.Error> =>
  asyncIt.iterable<err.Error>(async function*() {
    // collect all errors from the 'targetBranch'
    await pr.checkout(pr.targetBranch)
    const targetMap = await avocadoForDir(pr.workingDir)

    // collect all errors from the 'sourceBranch'
    await pr.checkout(pr.sourceBranch)
    const sourceMap = await avocadoForDir(pr.workingDir)

    // remove existing errors.
    for (const e of targetMap.keys()) {
      sourceMap.delete(e)
    }
    yield* sourceMap.values()
  })

/**
 * The function validates files in the given `cwd` folder and returns errors.
 */
export const avocado = (config: cli.Config): asyncIt.AsyncIterableEx<err.Error> =>
  asyncIt.iterable<err.Error>(async function*() {
    const pr = await devOps.createPullRequestProperties(config)
    // detect Azure DevOps Pull Request validation.
    if (pr !== undefined) {
      yield* avocadoForDevOps(pr)
    } else {
      yield* (await avocadoForDir(config.cwd)).values()
    }
  })
