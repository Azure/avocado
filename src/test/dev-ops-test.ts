// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path'
import * as pfs from '@ts-common/fs'
import { git, cli, devOps, avocado } from '../index'
import * as assert from 'assert'

/**
 * Create Azure DevOps environment for testing.
 *
 * @param name an environment name. It's used as a unique directory suffix.
 */
const createDevOpsEnv = async (name: string): Promise<cli.Config> => {
  const tmp = path.resolve(path.join('..', `avocado-tmp-${name}`))

  if (await pfs.exists(tmp)) {
    await pfs.recursiveRmdir(tmp)
  }

  // Create 'tmp/remote' folder.
  await pfs.mkdir(tmp)
  const remote = path.join(tmp, 'remote')
  await pfs.mkdir(remote)

  const gitRemote = git.repository(remote)

  // create a Git repository
  await gitRemote({ init: [] })
  await gitRemote({ config: ['user.email', 'test@example.com'] })
  await gitRemote({ config: ['user.name', 'test'] })

  // commit invalid 'specification/readme.md' to 'master'.
  const specification = path.join(remote, 'specification')
  await pfs.mkdir(specification)
  await pfs.writeFile(path.join(specification, 'readme.md'), '')
  await pfs.writeFile(path.join(remote, 'license'), '')
  await gitRemote({ add: ['.'] })
  await gitRemote({ commit: ['-m', '"initial commit"', '--no-gpg-sign'] })

  // commit removing 'specification/readme.md' to 'source'.
  await gitRemote({ checkout: ['-b', 'source'] })
  await pfs.unlink(path.join(specification, 'readme.md'))
  await pfs.writeFile(path.join(remote, 'textfile.txt'), '')
  await pfs.writeFile(path.join(remote, 'license'), 'MIT')
  await gitRemote({ add: ['.'] })
  await gitRemote({
    commit: ['-m', '"second commit"', '--no-gpg-sign'],
  })

  // create local Git repository
  const local = path.join(tmp, 'local')
  await pfs.mkdir(local)
  const gitLocal = git.repository(local)
  await gitLocal({ clone: ['../remote', '.'] })

  return {
    cwd: local,
    env: {
      SYSTEM_PULLREQUEST_TARGETBRANCH: 'master',
    },
  }
}

describe('Azure DevOps', () => {
  it('Azure DevOps and Avocado', async () => {
    const cfg = await createDevOpsEnv('458e3de4-ca9c-4f98-858a-6bb9863189e6')

    // run avocado as AzureDevOps pull request.
    const errors = await avocado(cfg).toArray()
    assert.deepStrictEqual(errors, [])
  })

  it('PR diff', async () => {
    const cfg = await createDevOpsEnv('cb48-4995-9348-af800342b723')
    const pr = await devOps.createPullRequestProperties(cfg)
    if (pr === undefined) {
      throw new Error('pr === undefined')
    }
    const files = await pr.diff()
    const expected = [
      { kind: 'Modified', path: 'license' },
      { kind: 'Deleted', path: 'specification/readme.md' },
      { kind: 'Added', path: 'textfile.txt' },
    ] as const
    assert.deepStrictEqual(files, expected)
  })
})
