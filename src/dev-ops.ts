import * as cli from "./cli"
import * as git from "./git"
import * as path from "path"
import * as fs from "@ts-common/fs"

export type PullRequestProperties = {
  readonly targetBranch: string
  readonly sourceBranch: string
  readonly workingDir: string
  readonly checkout: (branch: string) => Promise<void>
  // tslint:disable-next-line:prettier
  readonly diff: () => Promise<readonly string[]>
}

const sourceBranch = "source-b6791c5f-e0a5-49b1-9175-d7fd3e341cb8"

/**
 * Currently, the algorithm is recognizing Azure Dev Ops Pull Request if the `env` has
 * `SYSTEM_PULLREQUEST_TARGETBRANCH`. `cwd` should points to the source Git repository.
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
  const workingDir = path.resolve(path.join(cwd, "..", "c93b354fd9c14905bb574a8834c4d69b"))
  await fs.mkdir(workingDir)
  const workingGitRepository = git.repository(workingDir)
  await workingGitRepository({ clone: [cwd, "."] })
  return {
    targetBranch,
    sourceBranch,
    workingDir,
    checkout: async (branch: string) => {
      await workingGitRepository({ checkout: [branch] })
    },
    diff: async () => {
      const { stdout } = await originGitRepository({
        diff: ["--name-only", sourceBranch, targetBranch]
      })
      return stdout.split("\n").filter(v => v !== "")
    }
  }
}
