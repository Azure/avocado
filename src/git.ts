import * as util from "util"
import * as childProcess from "child_process"
import * as stringMap from "@ts-common/string-map"

const exec = util.promisify(childProcess.exec)

export type ExecResult = {
  readonly stdout: string
  readonly stderr: string
}

// tslint:disable-next-line:prettier
export type GenericCommand = stringMap.StringMap<readonly string[]>

export type Command =
  // tslint:disable-next-line:prettier
  { readonly config: readonly ["user.email" | "user.name", string] } |
  { readonly init: readonly [] } |
  { readonly add: readonly [string] } |
  { readonly commit: readonly ["-m", string, "--no-gpg-sign"] } |
  { readonly checkout: readonly ["-b", string] }

export const repository = (repositoryPath: string) =>
  async (command: Command) => {
    const g: GenericCommand = command
    for (const [cmd, args] of stringMap.entries(g)) {
      await exec(`git ${cmd} ${args.join(" ")}`, { cwd: repositoryPath })
    }
  }
