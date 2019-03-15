import avocado = require("../index")
import { describe } from "mocha"
import assert from "assert"

describe("cli", () => {
  it("no_file_found", async () => {
    const r = await avocado.cli("src/test/no_file_found")
    assert.strictEqual(r, 1)
  })
  it("unreferenced file", async () => {
    const r = await avocado.cli("src/test/unreferenced_file")
    assert.strictEqual(r, 1)
  })
})
