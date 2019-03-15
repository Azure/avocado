#!/usr/bin/env node
require("../dist/index")
  .cli("./")
  .then(code => process.exit(code))
  .catch(e => { console.error(e); process.exit(1); })