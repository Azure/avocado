import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as openApiMd from "@azure/openapi-markdown"
import * as asyncIt from "@ts-common/async-iterator"
import * as jsonParser from "@ts-common/json-parser"
import * as it from "@ts-common/iterator"
import * as json from "@ts-common/json"
import * as stringMap from "@ts-common/string-map"
import * as commonmark from "commonmark"
import * as cli from "./cli"
import * as git from "./git"
import nodeObjectHash = require("node-object-hash")

export type JsonParseError = {
  readonly code: "JSON_PARSE"
  readonly message: string
  readonly error: jsonParser.ParseError
}

export type NotAutoRestMarkDown = {
  readonly code: "NOT_AUTOREST_MARKDOWN"
  readonly message: string
  readonly readMeUrl: string
  readonly helpUrl: string
}

export type FileError = {
  readonly code: "NO_JSON_FILE_FOUND" | "UNREFERENCED_JSON_FILE"
  readonly message: string
  readonly readMeUrl: string
  readonly jsonUrl: string
}

export type Error = JsonParseError | FileError | NotAutoRestMarkDown

const errorCorrelationId = (error: Error) => {
  const toObject = () => {
    switch (error.code) {
      case "UNREFERENCED_JSON_FILE":
        return { code: error.code, url: error.jsonUrl }
      case "NO_JSON_FILE_FOUND":
        return { code: error.code, url: error.readMeUrl }
      case "NOT_AUTOREST_MARKDOWN":
        return { code: error.code, url: error.readMeUrl }
      case "JSON_PARSE":
        return {
          code: error.code,
          url: error.error.url,
          position: error.error.position
        }
    }
  }
  return nodeObjectHash().hash(toObject())
}

const validateSpecificationFolder = (cwd: string) =>
  asyncIt.iterable<Error>(async function*() {
    const specification = path.resolve(path.join(cwd, "specification"))
    if (await fs.exists(specification)) {
      yield* fs
        .recursiveReaddir(specification)
        .filter(f => path.basename(f).toLowerCase() === "readme.md")
        .flatMap(validateReadMeFile)
    }
  })

const validateSpecificationFolderMap = async (cwd: string) => {
  const map = new Map<string, Error>()
  for await (const e of validateSpecificationFolder(cwd)) {
    map.set(errorCorrelationId(e), e)
  }
  return map
}

const sourceBranch = "source-b6791c5f-e0a5-49b1-9175-d7fd3e341cb8"

/**
 * The function validates files in the given `cwd` folder and returns errors.
 *
 * @param { cwd, env }
 */
export const avocado = ({ cwd, env }: cli.Config): asyncIt.AsyncIterableEx<Error> =>
  asyncIt.iterable<Error>(async function*() {
    const targetBranch = env.SYSTEM_PULLREQUEST_TARGETBRANCH
    // detect Azure DevOps Pull Request validation.
    if (targetBranch !== undefined) {
      const sourceGitRepository = git.repository(cwd)
      await sourceGitRepository({ branch: [sourceBranch] })
      await sourceGitRepository({ branch: [targetBranch, `remotes/origin/${targetBranch}`] })

      // we have to clone the repository because we need to switch branches.
      // Switching branches in the current repository can be dangerous because Avocado
      // may be running from it.
      const target = path.resolve(path.join(cwd, "..", "target"))
      await fs.mkdir(target)
      const targetGitRepository = git.repository(target)
      await targetGitRepository({ clone: [cwd, "."] })

      await targetGitRepository({ checkout: [targetBranch] })
      const targetMap = await validateSpecificationFolderMap(target)

      await targetGitRepository({ checkout: [sourceBranch] })
      const sourceMap = await validateSpecificationFolderMap(target)

      for (const e of targetMap.keys()) {
        sourceMap.delete(e)
      }
      yield* sourceMap.values()
    } else {
      yield* (await validateSpecificationFolderMap(cwd)).values()
    }
  })

type Ref = {
  readonly url: string
  readonly pointer: string
}

const parseRef = (ref: string): Ref => {
  const i = ref.indexOf("#")
  return i < 0 ? { url: ref, pointer: "" } : { url: ref.substr(0, i), pointer: ref.substr(i + 1) }
}

const getRefs = (j: json.Json): it.IterableEx<string> =>
  json.isObject(j)
    ? stringMap
        .entries(j)
        .flatMap(([k, v]) => (k === "$ref" && typeof v === "string" ? it.concat([v]) : getRefs(v)))
    : it.isArray(j)
    ? it.flatMap(j, getRefs)
    : it.empty()

const getReferencedFileNames = (fileName: string, doc: json.Json) => {
  const dir = path.dirname(fileName)
  return getRefs(doc)
    .map(v => parseRef(v).url)
    .filter(u => u !== "")
    .map(u => path.resolve(path.join(dir, u)))
}

const jsonParse = (fileName: string, file: string) => {
  // tslint:disable-next-line:readonly-array
  const errors: Error[] = []
  const reportError = (e: jsonParser.ParseError) =>
    errors.push({ code: "JSON_PARSE", message: "The file is not valid JSON file.", error: e })
  const document = jsonParser.parse(fileName, file.toString(), reportError)
  return {
    errors,
    document
  }
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
        try {
          file = await fs.readFile(fileName)
        } catch (e) {
          yield {
            code: "NO_JSON_FILE_FOUND",
            message: "The JSON file is not found but it is referenced from the readme file.",
            readMeUrl: readMePath,
            jsonUrl: fileName
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
    if (v.type !== "block_quote") {
      return false
    }
    const p = v.firstChild
    if (p === null || p.type !== "paragraph") {
      return false
    }
    const t = p.firstChild
    if (t === null || t.type !== "text") {
      return false
    }
    return t.literal === "see https://aka.ms/autorest"
  })

const validateReadMeFile = (readMePath: string): asyncIt.AsyncIterableEx<Error> =>
  asyncIt.iterable<Error>(async function*() {
    const file = await fs.readFile(readMePath)
    // parse the `readme.md` file
    const m = md.parse(file.toString())
    if (!isAutoRestMd(m)) {
      yield {
        code: "NOT_AUTOREST_MARKDOWN",
        message: "The `readme.md` is not AutoRest markdown file.",
        readMeUrl: readMePath,
        helpUrl:
          "http://azure.github.io/autorest/user/literate-file-formats/configuration.html#the-file-format"
      }
    }
    const dir = path.dirname(readMePath)
    // get all input files from the `readme.md`.
    const inputFiles = openApiMd.getInputFiles(m.markDown).toArray()
    // normalize the file names.
    const inputFileSet = inputFiles
      .map(f => path.resolve(path.join(dir, ...f.split("\\"))))
      .reduce((s, v) => s.add(v), new Set<string>())
    // add all referenced files to the `set`
    yield* resolveFileReferences(readMePath, inputFileSet)
    // report errors if the `dir` folder has JSON files which are not referenced.
    yield* fs
      .recursiveReaddir(dir)
      .filter(filePath => path.extname(filePath) === ".json" && !inputFileSet.has(filePath))
      .map<Error>(filePath => ({
        code: "UNREFERENCED_JSON_FILE",
        message: "The JSON file is not referenced from the readme file.",
        readMeUrl: readMePath,
        jsonUrl: path.resolve(filePath)
      }))
  })
