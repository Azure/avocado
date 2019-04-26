// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as util from 'util'
import * as childProcess from 'child_process'

const execAsync = util.promisify(childProcess.exec)

export const exec = (command: string, options: childProcess.ExecOptions) =>
  execAsync(command, { maxBuffer: Infinity, ...options })
