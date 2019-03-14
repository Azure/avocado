#!/usr/bin/env node
require("../dist/index")
  .cli()
  .then(process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })