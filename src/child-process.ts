// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as childProcess from 'child_process'
import * as util from 'util'

const nodeJsExecFile = util.promisify(childProcess.execFile)

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

export const execFile = (
  file: string,
  args: readonly string[],
  options: childProcess.ExecFileOptionsWithStringEncoding,
): Promise<ExecResult> => nodeJsExecFile(file, args, { maxBuffer: Infinity, ...options })
