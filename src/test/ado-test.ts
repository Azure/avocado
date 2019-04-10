import * as path from "path"
import * as pfs from "@ts-common/fs"
import * as avocado from "../index"
import * as git from "../git"
import * as assert from "assert"
import * as cli from "../cli"
import * as ado from "../ado"

const createAdoEnv = async (name: string): Promise<cli.Config> => {
  const tmp = path.resolve(path.join("..", `avocado-tmp-${name}`))

  if (await pfs.exists(tmp)) {
    await pfs.recursiveRmdir(tmp)
  }

  // Create "tmp/remote" folder.
  await pfs.mkdir(tmp)
  const remote = path.join(tmp, "remote")
  await pfs.mkdir(remote)

  const gitRemote = git.repository(remote)

  // create a Git repository
  await gitRemote({ init: [] })
  await gitRemote({ config: ["user.email", "test@example.com"] })
  await gitRemote({ config: ["user.name", "test"] })

  // commit invalid "specification/readme.md" to "master".
  const specification = path.join(remote, "specification")
  await pfs.mkdir(specification)
  await pfs.writeFile(path.join(specification, "readme.md"), "")
  await gitRemote({ add: ["."] })
  await gitRemote({ commit: ["-m", '"add specification/readme.md"', "--no-gpg-sign"] })

  // commit removing "specification/readme.md" to "source".
  await gitRemote({ checkout: ["-b", "source"] })
  await pfs.unlink(path.join(specification, "readme.md"))
  await gitRemote({ add: ["."] })
  await gitRemote({ commit: ["-m", '"delete specification/readme.md"', "--no-gpg-sign"] })

  // create local Git repository
  const local = path.join(tmp, "local")
  await pfs.mkdir(local)
  const gitLocal = git.repository(local)
  await gitLocal({ clone: ["../remote", "."] })

  return {
    cwd: local,
    env: {
      SYSTEM_PULLREQUEST_TARGETBRANCH: "master"
    }
  }
}

describe("git", () => {
  it("Azure DevOps ", async () => {
    const cfg = await createAdoEnv("458e3de4-ca9c-4f98-858a-6bb9863189e6")

    // run avocado as AzureDevOps pull request.
    const errors = await avocado.avocado(cfg).toArray()
    assert.deepStrictEqual(errors, [])
  }).timeout(5000)

  it("Diff", async () => {
    const cfg = await createAdoEnv("cb48-4995-9348-af800342b723")
    const pr = await ado.createPullRequestProperties(cfg)
    if (pr === undefined) {
      throw new Error("pr === undefined")
    }
    const files = await pr.diff()
    assert.deepStrictEqual(files, ["specification/readme.md"])
  }).timeout(5000)
})
