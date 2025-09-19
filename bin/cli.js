#!/usr/bin/env node
const cli = require('../dist/cli')
const index = require('../dist/index')
const { parseArgs } = require('util')

// Define help text
const showHelp = () => {
  console.log(`Usage: avocado [options]

Options:
  --version       Show version number                                  [boolean]
  -f, --file      output detail result to log file
  -d, --dir       run avocado under directory
  --excludePaths  array contains path patterns to be ignored             [array]
  --includePaths  array contains path patterns to be included. If this option is
                  not set, all files will be included. If this option is set,
                  only files that match at least one pattern will be included
                                                                         [array]
  -h, --help      Show help                                            [boolean]`)
}

// Define parseArgs configuration
const options = {
  file: {
    type: 'string',
    short: 'f'
  },
  dir: {
    type: 'string',
    short: 'd'
  },
  excludePaths: {
    type: 'string',
    multiple: true
  },
  includePaths: {
    type: 'string',
    multiple: true
  },
  help: {
    type: 'boolean',
    short: 'h'
  },
  version: {
    type: 'boolean'
  }
}

// Parse arguments
let parsedArgs
try {
  parsedArgs = parseArgs({
    options,
    allowPositionals: true
  })
} catch (error) {
  console.error(`Error: ${error.message}`)
  showHelp()
  process.exit(1)
}

const { values: argv } = parsedArgs

// Handle help
if (argv.help) {
  showHelp()
  process.exit(0)
}

// Handle version
if (argv.version) {
  const packageJson = require('../package.json')
  console.log(packageJson.version)
  process.exit(0)
}

cli.run(index.avocado, index.UnifiedPipelineReport(argv.file), {
  cwd: process.cwd(),
  env: process.env,
  args: { dir: argv.dir, excludePaths: argv.excludePaths, includePaths: argv.includePaths },
})
