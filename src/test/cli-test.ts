// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { cli } from '../index'
import * as assert from 'assert'
import * as ai from '@ts-common/async-iterator'
import * as path from 'path'
import { IErrorLevel } from '../errors'

describe('cli', () => {
  type MyError = { readonly message: string } & IErrorLevel

  it('no errors, default output', async () => {
    // tslint:disable-next-line:no-let
    let cwd: unknown
    await cli.run(c => {
      cwd = c.cwd
      return ai.fromSequence<IErrorLevel>()
    })
    assert.strictEqual(cwd, path.resolve('./'))
    assert.strictEqual(process.exitCode, 0)
  })
  it('no errors', async () => {
    // tslint:disable-next-line:no-let
    let error = ''
    // tslint:disable-next-line:no-let
    let info = ''
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s),
    }
    await cli.run(() => ai.fromSequence<IErrorLevel>(), report)
    assert.strictEqual(process.exitCode, 0)
    assert.strictEqual(error, '')
    assert.strictEqual(info, 'errors: 0')
  })
  it('Error errors', async () => {
    // tslint:disable-next-line:no-let
    let error = ''
    // tslint:disable-next-line:no-let
    let info = ''
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s),
    }
    await cli.run(() => ai.fromSequence<MyError>(...Array<MyError>({ level: 'Error', message: 'some error' })), report)
    assert.strictEqual(process.exitCode, 1)
    assert.strictEqual(error, '\u001b[31merror: \u001b[0mlevel: Error\nmessage: some error\n')
    assert.strictEqual(info, 'errors: 1')
  })
  it('Warning errors', async () => {
    // tslint:disable-next-line:no-let
    let error = ''
    // tslint:disable-next-line:no-let
    let info = ''
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s),
    }
    await cli.run(
      () => ai.fromSequence<MyError>(...Array<MyError>({ level: 'Warning', message: 'some error' })),
      report,
    )
    assert.strictEqual(process.exitCode, 0)
    assert.strictEqual(error, '\u001b[33mwarning: \u001b[0mlevel: Warning\nmessage: some error\n')
    assert.strictEqual(info, 'errors: 0')
  })
  it('internal error: undefined error level', async () => {
    // tslint:disable-next-line:no-let
    let error = ''
    // tslint:disable-next-line:no-let
    let info = ''
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s),
    }
    // tslint:disable-next-line: no-any
    await cli.run(() => ai.fromSequence(...Array<any>({ level: 'hint', message: 'some error' })), report)
    assert.strictEqual(process.exitCode, 1)
    assert.strictEqual(
      error,
      '\u001b[31mINTERNAL ERROR: undefined error level. level: hint. \u001b[0mlevel: hint\nmessage: some error\n',
    )
    assert.strictEqual(info, 'errors: 1')
  })
  it('internal error', async () => {
    // tslint:disable-next-line:no-let
    let error = ''
    // tslint:disable-next-line:no-let
    let info = ''
    const report: cli.Report = {
      error: s => (error += s),
      info: s => (info += s),
    }
    const f = () => {
      // tslint:disable-next-line:no-throw
      throw new Error('critical error')
    }
    await cli.run(f, report)
    assert.strictEqual(process.exitCode, 1)
    assert.ok(error.startsWith('\x1b[31mINTERNAL ERROR\x1b[0m'))
    assert.strictEqual(info, '')
  })
})
