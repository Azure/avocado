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

type Specification = {
  /**
   * Path of `specs` JSON file
   */
  readonly path: string

  /**
   * readme referenced
   */
  readonly readMePath: string
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

const moveTo = (a: Set<string>, b: Set<string>, key: string): string => {
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
 * @param graySet files currently being explored
 * @param blackSet files have been explored
 */
const DFSTraversalValidate = (
  current: Specification,
  graySet: Set<string>,
  blackSet: Set<string>,
): asyncIt.AsyncIterableEx<err.Error> =>
  asyncIt.iterable<err.Error>(async function*() {
    if (!blackSet.has(current.path)) {
      graySet.add(current.path)
    }
    // tslint:disable-next-line:no-let
    let file

    // tslint:disable-next-line:no-try
    try {
      file = await fs.readFile(current.path)
    } catch (e) {
      yield {
        code: 'NO_JSON_FILE_FOUND',
        message: 'The JSON file is not found but it is referenced from the readme file.',
        readMeUrl: current.readMePath,
        jsonUrl: current.path,
      }
      return
    }
    const { errors, document } = jsonParse(current.path, file.toString())
    yield* errors
    const refFileNames = getReferencedFileNames(current.path, document)
    for (const refFileName of refFileNames) {
      if (graySet.has(refFileName)) {
        yield {
          code: 'CIRCULAR_REFERENCE',
          message: `The JSON exist circular reference`,
          readMeUrl: current.readMePath,
          jsonUrl: current.path,
        }
        moveTo(graySet, blackSet, refFileName)
      }

      if (!blackSet.has(refFileName)) {
        yield* DFSTraversalValidate({ path: refFileName, readMePath: current.readMePath }, graySet, blackSet)
      }
    }
    moveTo(graySet, blackSet, current.path)
  })

/**
 * validate given `readme.md` format
 */
const validateReadMeFile = (readMePath: string): asyncIt.AsyncIterableEx<err.Error> =>
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
  })

/**
 * Validate spec files in two steps:
 * 1. `DFSTraversalValidate`: Analyze specs as a directed graph to detect circular reference and
 *     generate `blackSet` that contains all explored specs.
 * 2.  Get difference set between `allInputFileSet` and `blackSet`, and then report `UNREFERENCED_JSON_FILE` error.
 *
 * @param inputFileSet files referenced from 'readme.md' is the subset of `allInputFileSet`
 * @param allInputFileSet files appear in specification folder.
 */
const validateInputFiles = (
  inputFileSet: Set<Specification>,
  allInputFileSet: Set<Specification>,
): asyncIt.AsyncIterableEx<err.Error> =>
  // tslint:disable-next-line: no-async-without-await
  asyncIt.iterable<err.Error>(async function*() {
    // report errors if the `dir` folder has JSON files where exist circular reference
    const graySet = new Set<string>()
    const blackSet = new Set<string>()
    for (const current of inputFileSet) {
      yield* DFSTraversalValidate(current, graySet, blackSet)
    }

    // report errors if the `dir` folder has JSON files which are not referenced
    yield* asyncIt
      .fromSync(allInputFileSet.values())
      .filter(spec => !blackSet.has(spec.path))
      .map<err.Error>(spec => ({
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The JSON file is not referenced from the readme file.',
        readMeUrl: spec.readMePath,
        jsonUrl: spec.path,
      }))
  })

const getInputFilesFromReadme = (readMePath: string): asyncIt.AsyncIterableEx<Specification> =>
  asyncIt.iterable<Specification>(async function*() {
    const file = await fs.readFile(readMePath)
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)

    yield* openApiMd
      .getInputFiles(m.markDown)
      .uniq()
      .map(f => path.resolve(path.join(dir, ...f.split('\\'))))
      .map<Specification>(f => ({ path: f, readMePath }))
  })

const getAllInputFilesUnderReadme = (readMePath: string): asyncIt.AsyncIterableEx<Specification> =>
  // tslint:disable-next-line: no-async-without-await
  asyncIt.iterable<Specification>(async function*() {
    const dir = path.dirname(readMePath)
    yield* fs
      .recursiveReaddir(dir)
      .filter(filePath => path.extname(filePath) === '.json')
      .map<Specification>(filePath => ({ path: filePath, readMePath }))
  })

/**
 * Validate global specification folder and prepare arguments for `validateInputFiles`.
 */
const validateSpecificationFolder = (cwd: string) =>
  asyncIt.iterable<err.Error>(async function*() {
    const specification = path.resolve(path.join(cwd, 'specification'))

    if (await fs.exists(specification)) {
      const allReadMeFiles = fs
        .recursiveReaddir(specification)
        .filter(f => path.basename(f).toLowerCase() === 'readme.md')

      yield* allReadMeFiles.flatMap(validateReadMeFile)

      const referencedFiles = await allReadMeFiles
        .flatMap(getInputFilesFromReadme)
        .fold((fileSet: Set<Specification>, spec) => {
          fileSet.add(spec)
          return fileSet
        }, new Set<Specification>())

      const allFiles = await allReadMeFiles
        .flatMap(getAllInputFilesUnderReadme)
        .fold((fileSet: Set<Specification>, spec) => {
          fileSet.add(spec)
          return fileSet
        }, new Set<Specification>())

      yield* validateInputFiles(referencedFiles, allFiles)
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
