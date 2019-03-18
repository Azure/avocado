import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as azureMd from "@azure/openapi-markdown"
import * as ai from "@ts-common/async-iterator"
import * as jp from "@ts-common/json-parser"
import * as it from "@ts-common/iterator"
import * as json from "@ts-common/json"
import * as sm from "@ts-common/string-map"

export const cli = async <T>(f: (path: string) => AsyncIterable<T>): Promise<number> => {
  try {
    const errors = await f("./")
    let code = 0
    for await (const e of errors) {
      console.error(e)
      code = 1
    }
    return code
  } catch (e) {
    console.error("INTERNAL ERROR")
    console.error(e);
    return 1
  }
}

export type JsonParseError = {
  readonly code: "JSON_PARSE",
  readonly error: jp.ParseError
}

export type FileError = {
  code: "NO_OPEN_API_FILE_FOUND" | "UNREFERENCED_OPEN_API_FILE"
  readonly message: string
  readonly readMeUrl: string
  readonly openApiUrl: string
}

export type Error = JsonParseError | FileError

export const avocado = (dir: string): ai.AsyncIterableEx<Error> =>
  fs.recursiveReaddir(path.resolve(dir))
    .filter(f => path.basename(f).toLowerCase() === "readme.md")
    .flatMap(validateReadMe)

type Ref = {
  readonly url: string
  readonly pointer: string
}

const parseRef = (ref: string): Ref => {
  const i = ref.indexOf("#")
  return i < 0 ? { url: "", pointer: ref } : { url: ref.substr(0, i), pointer: ref.substr(i + 1) }
}

const getRefs = (j: json.Json): it.IterableEx<string> =>
  json.isObject(j) ?
    sm.entries(j).flatMap(
      ([k, v]) => k === "$ref" && typeof v === "string" ?
        it.concat([v]) :
        getRefs(v)
    ) :
  it.isArray(j) ? it.flatMap(j, getRefs) :
  it.empty()

const resolveReferences = async (readMePath: string, fileNames: Set<string>) => {
  let fileNamesToCheck = it.toArray(fileNames)
  const errors: Error[] = []
  while (fileNamesToCheck.length !== 0) {
    const newFileNames = []
    for (const fileName of fileNamesToCheck) {
      if (await fs.exists(fileName)) {
        const file = await fs.readFile(fileName)
        const document = jp.parse(
          fileName,
          file.toString(),
          e => errors.push({ code: "JSON_PARSE", error: e})
        )
        const dir = path.dirname(fileName)
        const refFiles = getRefs(document)
          .map(v => parseRef(v).url)
          .filter(u => u !== "")
          .map(u => path.resolve(path.join(dir, u)))
        for (const rf of refFiles) {
          if (!fileNames.has(rf)) {
            fileNames.add(rf)
            newFileNames.push(rf)
          }
        }
      } else {
        errors.push({
          code: "NO_OPEN_API_FILE_FOUND",
          message: "the OpenAPI file is not found but it is referenced from the readme file.",
          readMeUrl: readMePath,
          openApiUrl: fileName
        })
      }
    }
    fileNamesToCheck = newFileNames
  }
  return errors
}

const validateReadMe = (readMePath: string): ai.AsyncIterableEx<Error> =>
  ai.iterable<Error>(async function *() {
    const file = await fs.readFile(readMePath)
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)
    const inputFiles = azureMd.getInputFiles(m.markDown).toArray()
    const normInputFiles = inputFiles.map(f => path.resolve(path.join(dir, f)))
    const set = normInputFiles.reduce((set, v) => set.add(v), new Set<string>())
    const fileNames = fs.recursiveReaddir(dir)
    const errors = await resolveReferences(readMePath, set)
    yield *errors
    for await (const f of fileNames) {
      if (path.extname(f) === ".json") {
        if (!set.has(f)) {
          yield {
            code: "UNREFERENCED_OPEN_API_FILE",
            message: "the OpenAPI file is not referenced from the readme file.",
            readMeUrl: readMePath,
            openApiUrl: path.resolve(f)
          }
        }
      }
    }
  })
