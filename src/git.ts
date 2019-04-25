import * as childProcess from './child-process'
import * as stringMap from '@ts-common/string-map'

export type ExecResult = {
  readonly stdout: string
  readonly stderr: string
}

export type GenericCommand = stringMap.StringMap<readonly string[]>

export type Command =
  { readonly config: readonly ['user.email' | 'user.name', string] } |
  { readonly init: readonly [] } |
  { readonly add: readonly [string] } |
  { readonly commit: readonly ['-m', string, '--no-gpg-sign'] } |
  { readonly checkout: readonly ['-b', string] | readonly [string] } |
  { readonly branch: readonly [string] | readonly [string, string] } |
  { readonly remote: readonly ['add', string, string] } |
  { readonly clone: readonly [string, string] } |
  {
    readonly diff:
      readonly ['--name-status' | '--name-only', '--no-renames', string, string]
  }

export const repository = (repositoryPath: string) =>
  async (command: Command) => {
    const g: GenericCommand = command
    const [cmd, args] = stringMap.entries(g).toArray()[0]
    return childProcess.exec(`git ${cmd} ${args.join(' ')}`, { cwd: repositoryPath })
  }
