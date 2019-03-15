import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as azureMd from "@azure/openapi-markdown"
import * as sm from "@ts-common/string-map"
import * as ai from "@ts-common/async-iterator"

// Command-Line Interface. The function should return `Promise<number>`,
// it should throw an exception or reject the promise in case of critical error only.
export const cli = async () => {
  const errors = await validateAll(path.resolve("./"))
  let i = 0
  for await (const e of errors) {
    console.error(e)
    ++i
  }
  return i
}

type Error = {
  readonly code: "NO_FILE_FOUND"
  readonly message: string
  readonly readMeUrl: string
  readonly openApiUrl: string
}

const validateAll = (dir: string): ai.AsyncIterableEx<Error> =>
  fs.recursiveReaddir(dir)
    .filter(f => path.basename(f).toLowerCase() === "readme.md")
    .flatMap(validateReadMe)

const validateReadMe = (readMePath: string): ai.AsyncIterableEx<Error> =>
  ai.iterable<Error>(async function *() {
    const file = await fs.readFile(readMePath)
    const m = md.parse(file.toString())
    const dir = path.dirname(readMePath)
    const tags = azureMd.getTagsToSettingsMapping(m.markDown)
    for (const p of sm.values(tags).flatMap(v => v["input-file"])) {
      const fullPath = path.join(dir, p)
      if (!await fs.exists(fullPath)) {
        yield {
          code: "NO_FILE_FOUND",
          message: "the OpenAPI file is not found but it is referenced from the readme file.",
          readMeUrl: readMePath,
          openApiUrl: p
        }
      }
    }
  })
