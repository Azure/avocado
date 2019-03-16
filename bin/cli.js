#!/usr/bin/env node
const a = require("../dist/index")
a.cli(a.avocado).then(process.exit)
