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
import * as yaml from "js-yaml"
import * as process from "process"

export type Report = {
  readonly error: (error: unknown) => void
  readonly info: (info: unknown) => void
  readonly env: stringMap.StringMap<string>
}

const consoleRed = "\x1b[31m"
const consoleReset = "\x1b[0m"

/**
 * The function executes the given `tool` and prints errors to `stderr`.
 *
 * @param tool is a function which returns errors as `AsyncIterable`.
 */
export const cli = async <T>(
  tool: (cwd: string) => AsyncIterable<T>,
  // tslint:disable-next-line:no-console
  report: Report = { error: console.error, info: console.log, env: process.env }
): Promise<number> => {
  try {
    const errors = await tool("./")
    // tslint:disable-next-line:no-let
    let errorsNumber = 0
    for await (const e of errors) {
      report.error(`${consoleRed}error: ${consoleReset}`)
      report.error(yaml.safeDump(e))
      ++errorsNumber
    }
    report.info(`errors: ${errorsNumber}`)
    return errorsNumber === 0 ? 0 : 1
  } catch (e) {
    report.error(`${consoleRed}INTERNAL ERROR${consoleReset}`)
    report.error(e)
    return 1
  }
}

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
  readonly code: "NO_OPEN_API_FILE_FOUND" | "UNREFERENCED_OPEN_API_FILE"
  readonly message: string
  readonly readMeUrl: string
  readonly openApiUrl: string
}

export type Error = JsonParseError | FileError | NotAutoRestMarkDown

/**
 * The function validates files in the given `dir` folder and returns errors.
 *
 * @param dir
 */
export const avocado = (dir: string): asyncIt.AsyncIterableEx<Error> =>
  fs
    .recursiveReaddir(path.resolve(dir))
    .filter(f => path.basename(f).toLowerCase() === "readme.md")
    .flatMap(validateReadMeFile)

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
            code: "NO_OPEN_API_FILE_FOUND",
            message: "The OpenAPI file is not found but it is referenced from the readme file.",
            readMeUrl: readMePath,
            openApiUrl: fileName
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
        code: "UNREFERENCED_OPEN_API_FILE",
        message: "The OpenAPI file is not referenced from the readme file.",
        readMeUrl: readMePath,
        openApiUrl: path.resolve(filePath)
      }))
  })
