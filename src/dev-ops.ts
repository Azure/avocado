import * as cli from './cli'
import * as git from './git'
import * as path from 'path'
import * as fs from '@ts-common/fs'

export type FileChangeKind = 'Added' | 'Deleted' | 'Modified'

export type FileChange = {
  readonly kind: FileChangeKind
  readonly path: string
}

/**
 * Properties of Pull Request in Azure DevOps CI.
 */
export type PullRequestProperties = {
  // Target Branch, for example `master`.
  readonly targetBranch: string

  // Source Branch, for example `myname/newchanges`.
  readonly sourceBranch: string

  // Working folder for a cloned directory. We can't switch branches in the original Git repository
  // so we use cloned repository.
  readonly workingDir: string

  // Checkout Git branch, for example, it can be `targetBranch` or `sourceBranch`.
  readonly checkout: (branch: string) => Promise<void>

  // The method returns a set of changes between `targetBranch` and `sourceBranch`.
  // tslint:disable-next-line:prettier
  readonly diff: () => Promise<readonly FileChange[]>
}

const sourceBranch = 'source-b6791c5f-e0a5-49b1-9175-d7fd3e341cb8'

const parseGitFileChangeKind = (line: string) => {
  switch (line[0]) {
    case 'A':
      return 'Added'
    case 'D':
      return 'Deleted'
    default:
      return 'Modified'
  }
}

/**
 * If the function is called in Azure DevOps CI for a Pull Request, it creates a
 * clone of the Git repository and returns properties of the Pull Request, such as
 * `targetBranch` and `sourceBranch`.
 *
 * The function returns `undefined` if it's not Azure DevOps CI for a Pull Request.
 *
 * Currently, the algorithm is recognizing Azure Dev Ops Pull Request if the `env` has
 * `SYSTEM_PULLREQUEST_TARGETBRANCH`. `cwd` should point to the source Git repository.
 */
export const createPullRequestProperties = async (
  // tslint:disable-next-line:prettier
  { cwd, env }: cli.Config
): Promise<PullRequestProperties | undefined> => {
  const targetBranch = env.SYSTEM_PULLREQUEST_TARGETBRANCH
  if (targetBranch === undefined) {
    return undefined
  }
  const originGitRepository = git.repository(cwd)
  await originGitRepository({ branch: [sourceBranch] })
  await originGitRepository({
    branch: [targetBranch, `remotes/origin/${targetBranch}`]
  })

  // we have to clone the repository because we need to switch branches.
  // Switching branches in the current repository can be dangerous because Avocado
  // may be running from it.
  const workingDir = path.resolve(path.join(cwd, '..', 'c93b354fd9c14905bb574a8834c4d69b'))
  await fs.mkdir(workingDir)
  const workingGitRepository = git.repository(workingDir)
  await workingGitRepository({ clone: [cwd, '.'] })
  return {
    targetBranch,
    sourceBranch,
    workingDir,
    checkout: async (branch: string) => {
      await workingGitRepository({ checkout: [branch] })
    },
    diff: async () => {
      const { stdout } = await originGitRepository({
        diff: ['--name-status', '--no-renames', targetBranch, sourceBranch]
      })
      return stdout
        .split('\n')
        .filter(v => v !== '')
        .map(line => ({
          kind: parseGitFileChangeKind(line),
          path: line.substr(2)
        }))
    }
  }
}
