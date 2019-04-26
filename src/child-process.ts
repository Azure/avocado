import * as util from 'util'
import * as childProcess from 'child_process'

export const exec = util.promisify(childProcess.exec)
