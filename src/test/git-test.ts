import * as path from "path"
import * as util from "util"
import * as fs from "fs"
import * as pfs from "@ts-common/fs"
import * as childProcess from "child_process"

const mkdir = util.promisify(fs.mkdir)
const rmdir = util.promisify(fs.rmdir)
const exec = util.promisify(childProcess.exec)
const unlink = util.promisify(fs.unlink)

const recursiveRmdir = async (dir: string): Promise<void> => {
  const list = await pfs.readdir(dir, { withFileTypes: true })
  await Promise.all(
    list.map(async f => {
      const p = path.join(dir, f.name)
      if (f.isDirectory()) {
        await recursiveRmdir(p)
      } else {
        await unlink(p)
      }
    })
  )
  await rmdir(dir)
}

describe("git", () => {
  it("git", async () => {
    const tmp = path.resolve("tmp")
    if (await pfs.exists(tmp)) {
      await recursiveRmdir(tmp)
    }
    await mkdir(tmp)
    const repo = path.join(tmp, "repo")
    await mkdir(repo)
    await exec("git init", { cwd: repo })
    await exec("git config user.email test@example.com", { cwd: repo })
    await exec("git config user.name test", { cwd: repo })
    await pfs.writeFile(path.join(repo, "a.json"), "{}")
    await exec("git add .", { cwd: repo })
    const commit = 'git commit -m comment"'
    await exec(commit, { cwd: repo })
  })
})
