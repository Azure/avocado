import * as stringMap from "@ts-common/string-map"
import * as yaml from "js-yaml"

export type Report = {
  readonly error: (error: unknown) => void
  readonly info: (info: unknown) => void
}

const consoleRed = "\x1b[31m"
const consoleReset = "\x1b[0m"

export type Config = {
  readonly cwd: string
  readonly env: stringMap.StringMap<string>
}

/**
 * The function executes the given `tool` and prints errors to `stderr`.
 *
 * @param tool is a function which returns errors as `AsyncIterable`.
 */
export const cli = async <T>(
  tool: (config: Config) => AsyncIterable<T>,
  // tslint:disable-next-line:no-console
  report: Report = { error: console.error, info: console.log }
): Promise<number> => {
  try {
    const errors = await tool({ cwd: "./", env: process.env })
    // tslint:disable-next-line:no-let
    let errorsNumber = 0
    for await (const e of errors) {
      report.error(`${consoleRed}error: ${consoleReset}`)
      report.error(yaml.safeDump(e))
      ++errorsNumber
    }
    report.info(`errors: ${errorsNumber}`)
    return errorsNumber === 0 ? 0 : 1
  } catch (e) {
    report.error(`${consoleRed}INTERNAL ERROR${consoleReset}`)
    report.error(e)
    return 1
  }
}
