#!/usr/bin/env node
const cli = require("../dist/cli")
const index = require("../dist/index")
cli.cli(index.avocado).then(process.exit)
