// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path'
import * as pfs from '@ts-common/fs'

export const create = async (name: string) => {
  const tmp = path.resolve(path.join('..', `avocado-tmp-${name}`))

  if (await pfs.exists(tmp)) {
    await pfs.recursiveRmdir(tmp)
  }

  await pfs.mkdir(tmp)
  return tmp
}
