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
    let errorsNumber = 0
    for await (const e of errors) {
      console.error(e)
      ++errorsNumber
    }
    console.log(`errors: ${errorsNumber}`)
    return errorsNumber === 0 ? 0 : 1
  } catch (e) {
    console.error("INTERNAL ERROR")
    console.error(e)
    return 1
  }
}

export type JsonParseError = {
  readonly code: "JSON_PARSE",
  readonly message: string
  readonly error: jsonParser.ParseError
}

export type FileError = {
  code: "NO_OPEN_API_FILE_FOUND" | "UNREFERENCED_OPEN_API_FILE"
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

const resolveReferences = (readMePath: string, fileNames: Set<string>) =>
  asyncIt.iterable<Error>(async function *() {
    let fileNamesToCheck = it.toArray(fileNames)
    while (fileNamesToCheck.length !== 0) {
      const newFileNames = []
      for (const fileName of fileNamesToCheck) {
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
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)
    const inputFiles = openApiMd.getInputFiles(m.markDown).toArray()
    const normInputFiles = inputFiles.map(f => path.resolve(path.join(dir, f)))
    const set = normInputFiles.reduce((set, v) => set.add(v), new Set<string>())
    const fileNames = fs.recursiveReaddir(dir)
    const errors = resolveReferences(readMePath, set)
    yield *errors
    for await (const f of fileNames) {
      if (path.extname(f) === ".json" && !set.has(f)) {
        yield {
          code: "UNREFERENCED_OPEN_API_FILE",
          message: "The OpenAPI file is not referenced from the readme file.",
          readMeUrl: readMePath,
          openApiUrl: path.resolve(f)
        }
      }
    }
  })
