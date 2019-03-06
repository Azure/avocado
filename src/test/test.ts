import * as avocado from "../index"
import * as assert from "assert"

describe("tests", () => {
  it("empty", async () => {
    const result = await avocado.cli()
    assert.strictEqual(result, 1)
  })
})
