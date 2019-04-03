import * as path from "path"
import * as pfs from "@ts-common/fs"
import * as avocado from "../index"
import * as git from "../git"

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
  it("git", async () => {
    const tmp = path.resolve("tmp")

    if (await pfs.exists(tmp)) {
      await recursiveRmdir(tmp)
    }

    // Create "tmp/repo" folder.
    await pfs.mkdir(tmp)
    const repoPath = path.join(tmp, "repo")
    await pfs.mkdir(repoPath)

    const gitRepo = git.repository(repoPath)

    // create Git repo
    await gitRepo({ init: [] })
    await gitRepo({ config: ["user.email", "test@example.com"] })
    await gitRepo({ config: ["user.name", "test"] })

    // commit "a.json" to "master".
    await pfs.writeFile(path.join(repoPath, "a.json"), "{}")
    await gitRepo({ add: ["."] })
    await gitRepo({ commit: ["-m", "comment", "--no-gpg-sign"] })

    // commit "a.json" to "source".
    await gitRepo({ checkout: ["-b", "source"] })
    await pfs.writeFile(path.join(repoPath, "a.json"), '{ "a": 3 }')
    await gitRepo({ add: ["."] })
    await gitRepo({ commit: ["-m", "comment", "--no-gpg-sign"] })

    // run avocado as AzureDevOps pull request.
    await avocado.avocado({
      cwd: repoPath,
      env: {
        SYSTEM_PULLREQUEST_SOURCEBRANCH: "source",
        SYSTEM_PULLREQUEST_TARGETBRANCH: "master"
      }
    })
  })
})
