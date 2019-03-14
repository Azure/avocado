import * as path from "path"
import * as fs from "@ts-common/fs"
import * as md from "@ts-common/commonmark-to-markdown"
import * as azureMd from "@azure/openapi-markdown"

// Command-Line Interface. The function should return `Promise<number>`,
// it shouldn't throw exceptions or reject the promise.
export const cli = async () => await validateAll(path.resolve("./"))

const validateAll = async (dir: string): Promise<void> => {
  for await (const f of fs.recursiveReaddir(dir)) {
    if (path.basename(f).toLowerCase() === "readme.md") {
      validateReadMe(f)
    }
  }
}

const validateReadMe = async (readMePath: string): Promise<void> => {
  const m = md.parse((await fs.readFile(readMePath)).toString())
  const tags = azureMd.getTagsToSettingsMapping(m.markDown)
  for (const tag in tags) {
    console.log(tag)
  }
}
