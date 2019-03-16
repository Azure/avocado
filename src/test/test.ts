import * as avocado from "../index"
import { describe } from "mocha"
import assert from "assert"
import * as ai from "@ts-common/async-iterator"
import * as path from "path"

describe("cli", () => {
  it("no errors", async () => {
    const r = await avocado.cli(() => ai.fromSequence())
    assert.strictEqual(r, 0)
  })
  it("with errors", async () => {
    const r = await avocado.cli(() => ai.fromSequence("error"))
    assert.strictEqual(r, 1)
  })
  it("internal error", async () => {
    const r = await avocado.cli(() => { throw "critical error" })
    assert.strictEqual(r, 1)
  })
})

describe("avocado", () => {
  it("no_file_found", async () => {
    const r = await avocado.avocado("src/test/no_file_found").toArray()
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: "NO_OPEN_API_FILE_FOUND",
        message: r[0].message,
        readMeUrl: path.resolve("src/test/no_file_found/readme.md"),
        openApiUrl: path.resolve("src/test/no_file_found/specs/some.json")
      }
    ]
    assert.deepStrictEqual(r, e)
  })
  it("unreferenced file", async () => {
    const r = await avocado.avocado("src/test/unreferenced_file").toArray()
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: "UNREFERENCED_OPEN_API_FILE",
        message: r[0].message,
        readMeUrl: path.resolve("src/test/unreferenced_file/readme.md"),
        openApiUrl: path.resolve("src/test/unreferenced_file/specs/some.json")
      }
    ]
    assert.deepStrictEqual(r, e)
  })
})
