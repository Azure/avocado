import * as path from "path"
import * as util from "util"
import * as pfs from "@ts-common/fs"
import * as childProcess from "child_process"

const exec = util.promisify(childProcess.exec)

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
    await pfs.mkdir(tmp)
    const repo = path.join(tmp, "repo")
    await pfs.mkdir(repo)
    const git = (cmd: string) => exec(`git ${cmd}`, { cwd: repo })
    await git("init")
    await git("config user.email test@example.com")
    await git("config user.name test")
    await pfs.writeFile(path.join(repo, "a.json"), "{}")
    await git("add .")
    await git("commit -m comment")
  })
})
