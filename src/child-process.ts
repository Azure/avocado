// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as childProcess from 'child_process'
import * as util from 'util'

const nodeJsExec = util.promisify(childProcess.exec)

export type ExecResult = {
  /**
   * Standard Output
   */
  readonly stdout: string
  /**
   * Standard Error
   */
  readonly stderr: string
}

export const exec = async (
  command: string,
  options: childProcess.ExecOptionsWithStringEncoding,
): Promise<ExecResult> => {
  console.log(`exec("${command}")`)
  const result = await nodeJsExec(command, { maxBuffer: Infinity, ...options })
  console.log(`stdout:\n${result.stdout.trim()}`)
  console.log(`stderr:\n${result.stderr.trim()}`)
  return result
}
