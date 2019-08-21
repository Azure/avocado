# Avocado

Another Validator of OpenAPI spec repository Configuration And Directories.

[![Build Status](https://dev.azure.com/azure-sdk/public/_apis/build/status/public.avocado?branchName=master)](https://dev.azure.com/azure-sdk/public/_build/latest?definitionId=120&branchName=master)

NPM: https://www.npmjs.com/package/@azure/avocado

## Overview

Avocado validate folder structure and configuration for repository "Azure/azure-rest-api-specs". Avocado report new errors involved in PR. Avocado is a CI tool that will trigger automatically by azure DevOps pipeline when a new pull request is created.

NOTE: When running in azure devops Avocado only report new errors involved in PR, but ignore the previous existing errors. When running in local machine, Avocado report all errors.

Avocado major functions are listed below:

- For a given directory validate whether exists `specification` and filter `readme.md` under the `specification` folder.
- Validate whether `readme.md` is autorest specific file which must contain `see https://aka.ms/autorest`
- Validate all `swagger file` whether is correct parsed by `json`, and check all referenced `json` file (`referenced json` file marked in json object has the key name `"$ref"`)
- Validate whether the folder has no referenced file. `swagger file` must be referenced by `readme.md` or other `swagger file`.
- Validate whether `swagger file` has a circular reference and report a warning.

## How to use

**install**: `npm install -g Azure/avocado`

**usage:** `avocado`

When type avocado in command line, avocado will validate in the current directory.

**example:**

Run all specs:Clone the repo `azure/azure-rest-api-specs` and run "avocado" in folder `azure/azure-rest-api-specs`.

Run single service specs: create a folder `specification`. and move your service specs folder in `specification`. run "avocado"

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
