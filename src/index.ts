import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as azureMd from "@azure/openapi-markdown"
import * as ai from "@ts-common/async-iterator"
import * as jp from "@ts-common/json-parser"

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

const validateReadMe = (readMePath: string): ai.AsyncIterableEx<Error> =>
  ai.iterable<Error>(async function *() {
    const file = await fs.readFile(readMePath)
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)
    const inputFiles = azureMd.getInputFiles(m.markDown).toArray()
    for (const p of inputFiles) {
      const fullPath = path.join(dir, p)
      if (!await fs.exists(fullPath)) {
        yield {
          code: "NO_OPEN_API_FILE_FOUND",
          message: "the OpenAPI file is not found but it is referenced from the readme file.",
          readMeUrl: readMePath,
          openApiUrl: fullPath
        }
      }
    }
    const normInputFiles = inputFiles.map(f => path.resolve(path.join(dir, f)))
    const set = normInputFiles.reduce((set, v) => set.add(v), new Set<string>())
    const files = fs.recursiveReaddir(dir)
    for await (const f of files) {
      if (path.extname(f) === ".json") {
        const file = await fs.readFile(f)
        const errors: jp.ParseError[] = []
        jp.parse(f, file.toString(), e => errors.push(e))
        for (const e of errors) {
          yield {
            code: "JSON_PARSE",
            error: e
          }
        }
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
