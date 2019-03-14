import avocado = require("../index")
import { describe } from "mocha"

describe("cli", () => {
  it("empty", async () => {
    process.chdir("src/test")
    await avocado.cli()
  })
})
