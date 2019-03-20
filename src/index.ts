import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as openApiMd from "@azure/openapi-markdown"
import * as asyncIt from "@ts-common/async-iterator"
import * as jsonParser from "@ts-common/json-parser"
import * as it from "@ts-common/iterator"
import * as json from "@ts-common/json"
import * as stringMap from "@ts-common/string-map"

/**
 * The function executes the given `tool` and prints errors to `stderr`.
 *
 * @param tool is a function which returns errors as `AsyncIterable`.
 */
export const cli = async <T>(tool: (path: string) => AsyncIterable<T>): Promise<number> => {
  try {
    const errors = await tool("./")
    // tslint:disable-next-line:no-let
    let errorsNumber = 0
    for await (const e of errors) {
      // tslint:disable-next-line:no-console
      console.error(e)
      ++errorsNumber
    }
    // tslint:disable-next-line:no-console
    console.log(`errors: ${errorsNumber}`)
    return errorsNumber === 0 ? 0 : 1
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error("INTERNAL ERROR")
    // tslint:disable-next-line:no-console
    console.error(e)
    return 1
  }
}

export type JsonParseError = {
  readonly code: "JSON_PARSE"
  readonly message: string
  readonly error: jsonParser.ParseError
}

export type FileError = {
  readonly code: "NO_OPEN_API_FILE_FOUND" | "UNREFERENCED_OPEN_API_FILE"
  readonly message: string
  readonly readMeUrl: string
  readonly openApiUrl: string
}

export type Error = JsonParseError | FileError

/**
 * The function validates files in the given `dir` folder and returns errors.
 *
 * @param dir
 */
export const avocado = (dir: string): asyncIt.AsyncIterableEx<Error> =>
  fs.recursiveReaddir(path.resolve(dir))
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
  json.isObject(j) ?
    stringMap.entries(j).flatMap(
      ([k, v]) => k === "$ref" && typeof v === "string" ?
        it.concat([v]) :
        getRefs(v)
    ) :
  it.isArray(j) ? it.flatMap(j, getRefs) :
  it.empty()

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
  const document = jsonParser.parse(
    fileName,
    file.toString(),
    e => errors.push({ code: "JSON_PARSE", message: "The file is not valid JSON file.", error: e})
  )
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
  asyncIt.iterable<Error>(async function *() {
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
        yield *errors
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
  asyncIt.iterable<Error>(async function *() {
    const file = await fs.readFile(readMePath)
    // parse the `readme.md` file
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)
    // get all input files from the `readme.md`.
    const inputFiles = openApiMd.getInputFiles(m.markDown).toArray()
    // normalize the file names.
    const inputFileSet = inputFiles
      .map(f => path.resolve(path.join(dir, f)))
      .reduce((s, v) => s.add(v), new Set<string>())
    // add all referenced files to the `set`
    yield *resolveFileReferences(readMePath, inputFileSet)
    // report errors if the `dir` folder has JSON files which are not referenced.
    yield *fs.recursiveReaddir(dir)
      .filter(filePath => path.extname(filePath) === ".json" && !inputFileSet.has(filePath))
      .map<Error>(filePath => ({
          code: "UNREFERENCED_OPEN_API_FILE",
          message: "The OpenAPI file is not referenced from the readme file.",
          readMeUrl: readMePath,
          openApiUrl: path.resolve(filePath)
        }))
  })
