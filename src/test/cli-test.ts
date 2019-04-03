import * as cli from "../cli"
import { describe } from "mocha"
import assert from "assert"
import * as ai from "@ts-common/async-iterator"

describe("cli", () => {
  it("no errors, default output", async () => {
    const r = await cli.cli(() => ai.fromSequence())
    assert.strictEqual(r, 0)
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
    const r = await cli.cli(() => ai.fromSequence(), report)
    assert.strictEqual(r, 0)
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
    const r = await cli.cli(() => ai.fromSequence("some error"), report)
    assert.strictEqual(r, 1)
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
    const r = await cli.cli(f, report)
    assert.strictEqual(r, 1)
    assert.ok(error.startsWith("\x1b[31mINTERNAL ERROR\x1b[0m"))
    assert.strictEqual(info, "")
  })
})
