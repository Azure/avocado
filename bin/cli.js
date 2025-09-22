#!/usr/bin/env node
const cli = require('../dist/cli')
const index = require('../dist/index')

var argv = require('yargs')()
  .usage('Usage: avocado [options]')
  .alias('f', 'file')
  .describe('f', 'output detail result to log file')
  .alias('d', 'dir')
  .describe('d', 'run avocado under directory')
  .option('excludePaths', {
    type: 'array',
    desc: 'array contains path patterns to be ignored',
  })
  .option('includePaths', {
    type: 'array',
    desc:
      'array contains path patterns to be included. If this option is not set, all files will be included. If this option is set, only files that match at least one pattern will be included',
  })
  .help('h')
  .alias('h', 'help').argv



cli.run(index.avocado, index.UnifiedPipelineReport(argv.f), {
  cwd: process.cwd(),
  env: process.env,
  args: { dir: argv.d, excludePaths: argv.excludePaths, includePaths: argv.includePaths },
})
