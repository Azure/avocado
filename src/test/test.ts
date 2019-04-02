import * as avocado from "../index"
import { describe } from "mocha"
import assert from "assert"
import * as ai from "@ts-common/async-iterator"
import * as path from "path"

describe("cli", () => {
  it("no errors, default output", async () => {
    const r = await avocado.cli(() => ai.fromSequence())
    assert.strictEqual(r, 0)
  })
  it("no errors", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: avocado.Report = {
      error: s => (error += s),
      info: s => (info += s),
      env: {}
    }
    const r = await avocado.cli(() => ai.fromSequence(), report)
    assert.strictEqual(r, 0)
    assert.strictEqual(error, "")
    assert.strictEqual(info, "errors: 0")
  })
  it("with errors", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: avocado.Report = {
      error: s => (error += s),
      info: s => (info += s),
      env: {}
    }
    const r = await avocado.cli(() => ai.fromSequence("some error"), report)
    assert.strictEqual(r, 1)
    assert.strictEqual(error, "\x1b[31merror: \x1b[0msome error\n")
    assert.strictEqual(info, "errors: 1")
  })
  it("internal error", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: avocado.Report = {
      error: s => (error += s),
      info: s => (info += s),
      env: {}
    }
    const f = () => {
      throw new Error("critical error")
    }
    const r = await avocado.cli(f, report)
    assert.strictEqual(r, 1)
    assert.ok(error.startsWith("\x1b[31mINTERNAL ERROR\x1b[0m"))
    assert.strictEqual(info, "")
  })
})

describe("avocado", () => {
  it("not autorest markdown", async () => {
    const r = await avocado.avocado("src/test/not_autorest_markdown").toArray()
    const expected: unknown = [
      {
        code: "NOT_AUTOREST_MARKDOWN",
        message: "The `readme.md` is not AutoRest markdown file.",
        readMeUrl: path.resolve("src/test/not_autorest_markdown/readme.md"),
        helpUrl:
          "http://azure.github.io/autorest/user/literate-file-formats/configuration.html#the-file-format"
      }
    ]
    assert.deepStrictEqual(r, expected)
  })

  it("no file found", async () => {
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

  it("invalid ref", async () => {
    const r = await avocado.avocado("src/test/invalid_ref").toArray()
    const expected: unknown = [
      {
        code: "NO_OPEN_API_FILE_FOUND",
        message: "The OpenAPI file is not found but it is referenced from the readme file.",
        openApiUrl: path.resolve("src/test/invalid_ref/specs/a.json"),
        readMeUrl: path.resolve("src/test/invalid_ref/readme.md")
      }
    ]
    assert.deepStrictEqual(r, expected)
  })

  it("backslash", async () => {
    const r = await avocado.avocado("src/test/backslash").toArray()
    const expected: unknown = []
    assert.deepStrictEqual(r, expected)
  })
})
