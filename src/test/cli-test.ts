import { cli } from "../index"
import { describe } from "mocha"
import assert from "assert"
import * as ai from "@ts-common/async-iterator"
import * as path from "path"

describe("cli", () => {
  it("no errors, default output", async () => {
    // tslint:disable-next-line:no-let
    let cwd: unknown
    await cli.run(c => {
      cwd = c.cwd
      return ai.fromSequence()
    })
    assert.strictEqual(cwd, path.resolve("./"))
    assert.strictEqual(process.exitCode, 0)
  })
  it("no errors", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s)
    }
    await cli.run(() => ai.fromSequence(), report)
    assert.strictEqual(process.exitCode, 0)
    assert.strictEqual(error, "")
    assert.strictEqual(info, "errors: 0")
  })
  it("with errors", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s)
    }
    await cli.run(() => ai.fromSequence("some error"), report)
    assert.strictEqual(process.exitCode, 1)
    assert.strictEqual(error, "\x1b[31merror: \x1b[0msome error\n")
    assert.strictEqual(info, "errors: 1")
  })
  it("internal error", async () => {
    // tslint:disable-next-line:no-let
    let error: string = ""
    // tslint:disable-next-line:no-let
    let info: string = ""
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s)
    }
    const f = () => {
      throw new Error("critical error")
    }
    await cli.run(f, report)
    assert.strictEqual(process.exitCode, 1)
    assert.ok(error.startsWith("\x1b[31mINTERNAL ERROR\x1b[0m"))
    assert.strictEqual(info, "")
  })
})
