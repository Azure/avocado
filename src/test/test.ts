import * as avocado from "../index"
import { describe } from "mocha"
import assert from "assert"
import * as ai from "@ts-common/async-iterator"

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
    assert.strictEqual(r.length, 1)
  })
  it("unreferenced file", async () => {
    const r = await avocado.avocado("src/test/unreferenced_file").toArray()
    assert.strictEqual(r.length, 1)
  })
})
