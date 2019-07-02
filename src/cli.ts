// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as stringMap from '@ts-common/string-map'
import * as yaml from 'js-yaml'

export type Report = {
  /**
   * This is a callback function to report an error.
   */
  readonly error: (error: unknown) => void
  /**
   * This is a callback function to report an info.
   */
  readonly info: (info: unknown) => void
}

const consoleRed = '\x1b[31m'
const consoleReset = '\x1b[0m'

export type Config = {
  /**
   * Current working directory.
   */
  readonly cwd: string
  /**
   * Environment variables.
   */
  readonly env: stringMap.StringMap<string>
}

export const defaultConfig = () => ({
  cwd: process.cwd(),
  env: process.env,
})

/**
 * The function executes the given `tool` and prints errors to `stderr`.
 *
 * @param tool is a function which returns errors as `AsyncIterable`.
 */
// tslint:disable-next-line:no-async-without-await
export const run = async <T>(
  tool: (config: Config) => AsyncIterable<T>,
  // tslint:disable-next-line:no-console no-unbound-method
  report: Report = { error: console.error, info: console.log },
): Promise<void> => {
  // tslint:disable-next-line:no-try
  try {
    const errors = tool(defaultConfig())
    // tslint:disable-next-line:no-let
    let errorsNumber = 0
    for await (const e of errors) {
      report.error(`${consoleRed}error: ${consoleReset}`)
      report.error(yaml.safeDump(e))
      errorsNumber += 1
    }
    report.info(`errors: ${errorsNumber}`)
    // tslint:disable-next-line:no-object-mutation
    process.exitCode = errorsNumber === 0 ? 0 : 1
  } catch (e) {
    report.error(`${consoleRed}INTERNAL ERROR${consoleReset}`)
    report.error(e)
    // tslint:disable-next-line:no-object-mutation
    process.exitCode = 1
  }
}
