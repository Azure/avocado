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
    const tmp = path.resolve("tmp")

    if (await pfs.exists(tmp)) {
      await recursiveRmdir(tmp)
    }

    // Create "tmp/remote" folder.
    await pfs.mkdir(tmp)
    const remote = path.join(tmp, "remote")
    await pfs.mkdir(remote)

    const gitRemote = git.repository(remote)

    // create Git repo
    await gitRemote({ init: [] })
    await gitRemote({ config: ["user.email", "test@example.com"] })
    await gitRemote({ config: ["user.name", "test"] })

    // commit "a.json" to "master".
    await pfs.writeFile(path.join(remote, "a.json"), "{}")
    await gitRemote({ add: ["."] })
    await gitRemote({ commit: ["-m", "comment", "--no-gpg-sign"] })

    // commit "a.json" to "source".
    await gitRemote({ checkout: ["-b", "source"] })
    await pfs.writeFile(path.join(remote, "a.json"), '{ "a": 3 }')
    await gitRemote({ add: ["."] })
    await gitRemote({ commit: ["-m", "comment", "--no-gpg-sign"] })

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
          SYSTEM_PULLREQUEST_SOURCEBRANCH: "source",
          SYSTEM_PULLREQUEST_TARGETBRANCH: "master"
        }
      })
      .toArray()
    assert.deepStrictEqual(errors, [])
  })
})
