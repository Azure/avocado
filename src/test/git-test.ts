import * as path from "path"
import * as pfs from "@ts-common/fs"
import * as avocado from "../index"
import * as git from "../git"
import * as assert from "assert"

const recursiveRmdir = async (dir: string): Promise<void> => {
  const list = await pfs.readdir(dir, { withFileTypes: true })
  await Promise.all(
    list.map(async f => {
      const p = path.join(dir, f.name)
      if (f.isDirectory()) {
        await recursiveRmdir(p)
      } else {
        await pfs.unlink(p)
      }
    })
  )
  await pfs.rmdir(dir)
}

describe("git", () => {
  it("Azure DevOps ", async () => {
    const tmp = path.resolve(path.join("..", "avocado-tmp-458e3de4-ca9c-4f98-858a-6bb9863189e6"))

    if (await pfs.exists(tmp)) {
      await recursiveRmdir(tmp)
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

    // run avocado as AzureDevOps pull request.
    const errors = await avocado
      .avocado({
        cwd: local,
        env: {
          SYSTEM_PULLREQUEST_TARGETBRANCH: "master"
        }
      })
      .toArray()
    assert.deepStrictEqual(errors, [])
  }).timeout(5000)
})
