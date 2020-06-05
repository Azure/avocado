#!/usr/bin/env node
const cli = require('../dist/cli')
const index = require('../dist/index')

var argv = require('yargs')
  .usage('Usage: avocado [options]')
  .alias('f', 'file')
  .describe('f', 'output detail result to log file')
  .help('h')
  .alias('h', 'help').argv


cli.run(index.avocado, index.UnifiedPipelineReport(argv.f))
