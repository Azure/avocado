// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as util from 'util'
import * as childProcess from 'child_process'

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

export const exec = async (command: string, options: childProcess.ExecOptions): Promise<ExecResult> =>
  nodeJsExec(command, { maxBuffer: Infinity, encoding: 'utf8', ...options }) as Promise<ExecResult>
