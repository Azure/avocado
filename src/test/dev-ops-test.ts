// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path'
import * as pfs from '@ts-common/fs'
import { git, cli, devOps, avocado } from '../index'
import * as assert from 'assert'
import * as tmpDir from './tmp-dir'

/**
 * Create Azure DevOps environment for testing.
 *
 * @param name an environment name. It's used as a unique directory suffix.
 */
const createDevOpsEnv = async (name: string): Promise<cli.Config> => {
  const tmp = await tmpDir.create(name)

  // Create '"${tmp}/remote"' folder.
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
  await pfs.writeFile(
    path.join(specification, 'file1.json'),
    `
  {
    "a": "foo",
    "b": [
      "bar1",
      "bar2",
      "bar3"
    ]
  }
  `,
  )

  await pfs.writeFile(
    path.join(specification, 'file2.json'),
    `
  {
    "a": "foo"
  }
  `,
  )

  await pfs.writeFile(
    path.join(specification, 'file3.json'),
    `
  {
    "a": "foo"
  }
  `,
  )

  await pfs.writeFile(path.join(remote, 'license'), '')
  await gitRemote({ add: ['.'] })
  await gitRemote({ commit: ['-m', '"initial commit"', '--no-gpg-sign'] })

  // commit removing 'specification/readme.md' to 'source'.
  await gitRemote({ checkout: ['-b', 'source'] })
  await pfs.unlink(path.join(specification, 'readme.md'))
  await pfs.writeFile(
    path.join(specification, 'file1.json'),
    `
  {
    "a": "foo",
    "b": ["bar1","bar2","bar3"]
  }
  `,
  )

  await pfs.writeFile(
    path.join(specification, 'file2.json'),
    `
  {
    "a": "foo",
    "b": "bar"
  }
  `,
  )

  // file with invalid JSON
  await pfs.writeFile(path.join(specification, 'file3.json'), `random string`)

  // json file that did not exist
  await pfs.writeFile(path.join(specification, 'file4.json'), `{"foo":"bar"}`)

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
    const cfg = await createDevOpsEnv('devops')

    // run avocado as AzureDevOps pull request.
    const errors = await avocado(cfg).toArray()
    assert.deepStrictEqual(errors, [])
  })

  it('PR diff', async () => {
    const cfg = await createDevOpsEnv('devops-pr-diff')
    const pr = await devOps.createPullRequestProperties(cfg)
    if (pr === undefined) {
      // tslint:disable-next-line:no-throw
      throw new Error('pr === undefined')
    }
    const files = await pr.diff()
    const expected = [
      { kind: 'Modified', path: 'license' },
      { kind: 'Modified', path: 'specification/file1.json' },
      { kind: 'Modified', path: 'specification/file2.json' },
      { kind: 'Modified', path: 'specification/file3.json' },
      { kind: 'Added', path: 'specification/file4.json' },
      { kind: 'Deleted', path: 'specification/readme.md' },
      { kind: 'Added', path: 'textfile.txt' },
    ] as const
    assert.deepStrictEqual(files, expected)
  })

  it('PR structural diff', async () => {
    const cfg = await createDevOpsEnv('devops-pr-diff')
    const pr = await devOps.createPullRequestProperties(cfg)
    if (pr === undefined) {
      // tslint:disable-next-line:no-throw
      throw new Error('pr === undefined')
    }
    const files = await pr.jsonStructuralDiff().toArray()
    const expected = ['specification/file2.json', 'specification/file3.json', 'specification/file4.json'] as const
    assert.deepStrictEqual(files, expected)
  })

  it('PR with no specifications folder', async () => {
    const tmp = await tmpDir.create('no-specifications')

    // Create '"${tmp}/remote"' folder.
    const remote = path.join(tmp, 'remote')
    await pfs.mkdir(remote)
    const gitRemote = git.repository(remote)

    // create a Git repository
    await gitRemote({ init: [] })
    await gitRemote({ config: ['user.email', 'test@example.com'] })
    await gitRemote({ config: ['user.name', 'test'] })

    await pfs.writeFile(path.join(remote, 'license'), '')
    await gitRemote({ add: ['.'] })
    await gitRemote({ commit: ['-m', '"initial commit"', '--no-gpg-sign'] })

    // commit removing 'specification/readme.md' to 'source'.
    await gitRemote({ checkout: ['-b', 'source'] })

    // create local Git repository
    const local = path.join(tmp, 'local')
    await pfs.mkdir(local)
    const gitLocal = git.repository(local)
    await gitLocal({ clone: ['../remote', '.'] })

    const errors = await avocado({ cwd: local, env: { SYSTEM_PULLREQUEST_TARGETBRANCH: 'master' } }).toArray()
    assert.deepStrictEqual(errors, [])
  })
})
