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
    const r = await avocado.cli(() => { throw new Error("critical error") })
    assert.strictEqual(r, 1)
  })
})

describe("avocado", () => {

  it("no_file_found", async () => {
    const r = await avocado.avocado("src/test/no_file_found").toArray()
    const r0 = r[0]
    if (r0.code === "JSON_PARSE") {
      throw new Error('r0.code === "JSON_PARSE"')
    }
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: "NO_OPEN_API_FILE_FOUND",
        message: r0.message,
        readMeUrl: path.resolve("src/test/no_file_found/readme.md"),
        openApiUrl: path.resolve("src/test/no_file_found/specs/some.json")
      }
    ]
    assert.deepStrictEqual(r, e)
  })

  it("unreferenced file", async () => {
    const r = await avocado.avocado("src/test/unreferenced_file").toArray()
    const r0 = r[0]
    if (r0.code === "JSON_PARSE") {
      throw new Error('r0.code === "JSON_PARSE"')
    }
    const e: ReadonlyArray<avocado.Error> = [
      {
        code: "UNREFERENCED_OPEN_API_FILE",
        message: r0.message,
        readMeUrl: path.resolve("src/test/unreferenced_file/readme.md"),
        openApiUrl: path.resolve("src/test/unreferenced_file/specs/some.json")
      }
    ]
    assert.deepStrictEqual(r, e)
  })

  it("invalid JSON", async () => {
    const r = await avocado.avocado("src/test/invalid_json").toArray()
    assert.deepStrictEqual(r, [
      {
        code: "JSON_PARSE",
        message: "The file is not valid JSON file.",
        error: {
          code: "unexpected token",
          kind: "structure",
          message: "unexpected token, token: }, line: 3, column: 1",
          position: {
            column: 1,
            line: 3
          },
          token: "}",
          url: path.resolve("src/test/invalid_json/specs/some.json")
        }
      }
    ])
  })

  it("invalid_ref", async () => {
    const r = await avocado.avocado("src/test/invalid_ref").toArray()
    assert.deepStrictEqual(r, [
      {
        code: "NO_OPEN_API_FILE_FOUND",
        message: "The OpenAPI file is not found but it is referenced from the readme file.",
        openApiUrl: path.resolve("src/test/invalid_ref/specs/a.json"),
        readMeUrl: path.resolve("src/test/invalid_ref/readme.md"),
      }
    ])
  })
})
