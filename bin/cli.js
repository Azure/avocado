#!/usr/bin/env node
const index = require("../dist/index")
index.cli(index.avocado).then(process.exit)
