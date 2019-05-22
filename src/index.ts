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

export { devOps, cli, git, childProcess }

export type JsonParseError = {
  /**
   * Error code. Always 'JSON_PARSE'
   */
  readonly code: 'JSON_PARSE'
  /**
   * Error Message
   */
  readonly message: string
  /**
   * JSON Error.
   */
  readonly error: jsonParser.ParseError
}

export type NotAutoRestMarkDown = {
  /**
   * Error code.
   */
  readonly code: 'NOT_AUTOREST_MARKDOWN'
  /**
   * Error message.
   */
  readonly message: string
  /**
   * URL of `readme.md` file.
   */
  readonly readMeUrl: string
  /**
   * Help URL.
   */
  readonly helpUrl: string
}

export type FileError = {
  /**
   * Error code.
   */
  readonly code: 'NO_JSON_FILE_FOUND' | 'UNREFERENCED_JSON_FILE'
  /**
   * Error message.
   */
  readonly message: string
  /**
   * URL of `readme.md` file.
   */
  readonly readMeUrl: string
  /**
   * URL of JSON file.
   */
  readonly jsonUrl: string
}

export type Error = JsonParseError | FileError | NotAutoRestMarkDown

const errorCorrelationId = (error: Error) => {
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
  const errors: Error[] = []
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

/**
 * The function finds all referenced files and put them in the `fileNames` set.
 *
 * @param readMePath a path to `readme.md` as the original source of `fileNames` set.
 * @param fileNames a set of file names from `readme.md` file.
 */
const resolveFileReferences = (readMePath: string, fileNames: Set<string>) =>
  asyncIt.iterable<Error>(async function*() {
    // tslint:disable-next-line:no-let
    let fileNamesToCheck = it.toArray(fileNames)
    // read references from `fileNamesToCheck` until there are no files are left.
    while (fileNamesToCheck.length !== 0) {
      // tslint:disable-next-line:readonly-array
      const newFileNames = []
      for (const fileName of fileNamesToCheck) {
        // tslint:disable-next-line:no-let
        let file: Buffer
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
          continue
        }
        const { errors, document } = jsonParse(fileName, file.toString())
        yield* errors
        const refFileNames = getReferencedFileNames(fileName, document)
        for (const refFileName of refFileNames) {
          if (!fileNames.has(refFileName)) {
            fileNames.add(refFileName)
            newFileNames.push(refFileName)
          }
        }
      }
      fileNamesToCheck = newFileNames
    }
  })

const validateReadMeFile = (readMePath: string): asyncIt.AsyncIterableEx<Error> =>
  asyncIt.iterable<Error>(async function*() {
    const file = await fs.readFile(readMePath)
    // parse the `readme.md` file
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
    // get all input files from the `readme.md`.
    const inputFiles = openApiMd.getInputFiles(m.markDown).toArray()
    // normalize the file names.
    const inputFileSet = inputFiles
      .map(f => path.resolve(path.join(dir, ...f.split('\\'))))
      .reduce((s, v) => s.add(v), new Set<string>())
    // add all referenced files to the `set`
    yield* resolveFileReferences(readMePath, inputFileSet)
    const files = await fs.recursiveReaddir(dir).toArray()
    // report errors if the `dir` folder has JSON files which are not referenced.
    yield* files
      .filter(filePath => path.extname(filePath) === '.json' && !inputFileSet.has(filePath))
      .map<Error>(filePath => ({
        code: 'UNREFERENCED_JSON_FILE',
        message: 'The JSON file is not referenced from the readme file.',
        readMeUrl: readMePath,
        jsonUrl: path.resolve(filePath),
      }))
  })

const validateSpecificationFolder = (cwd: string) =>
  asyncIt.iterable<Error>(async function*() {
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
  const map = new Map<string, Error>()
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
const avocadoForDevOps = (pr: devOps.PullRequestProperties): asyncIt.AsyncIterableEx<Error> =>
  asyncIt.iterable<Error>(async function*() {
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
export const avocado = (config: cli.Config): asyncIt.AsyncIterableEx<Error> =>
  asyncIt.iterable<Error>(async function*() {
    const pr = await devOps.createPullRequestProperties(config)
    // detect Azure DevOps Pull Request validation.
    if (pr !== undefined) {
      yield* avocadoForDevOps(pr)
    } else {
      yield* (await avocadoForDir(config.cwd)).values()
    }
  })
