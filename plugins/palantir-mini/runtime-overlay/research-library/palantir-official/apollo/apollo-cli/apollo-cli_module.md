---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_module/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a898e1fb5dfbd079ff90177ee53cf8bc95f8c770729fc67286a5ff63070698db"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli module"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli module

Manage Apollo modules

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for module |

### Flags inherited from parent commands

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--apollo-client-id` | Client ID to use for generating Bearer Token |
| `--apollo-client-secret` | Client secret to use for generating Bearer Token |
| `--apollo-token` | Bearer Token to use for authenticated endpoints |
| `--apollo-token-provider` | Specifies how the Bearer Token used for authenticated Apollo endpoint calls is provided. Valid values are "auto", "static", or "service-user" (default "auto"). If "auto" is specified, will use either the Bearer Token provided by "apollo-token" or a Bearer Token obtained by using "apollo-client-id" and "apollo-client-secret" to generate a token from Multipass depending on which values are set (but will error if both values are set). If "static" is specified, the token provided by "apollo-token" is used. If "service-user" is specified, "apollo-client-id" and "apollo-client-secret" are used to generate a token from Multipass. |
| `--apollo-url` | Base URL for Apollo that is used to derive the API endpoints |
| `--debug` | Enable debug level logging |
| `-e`, `--environment` | Environment ID (including suffix) to use for environment-scoped commands |
| `--http-timeout` | Timeout in minutes for all apollo requests |
| `-k`, `--insecure-skip-verify` | Skip verification of server certificate |
| `-o`, `--output` | Output format (json,yaml,pretty) |
| `--profile` | Use a specific profile from your configuration file |
| `--quiet` | Do not print log output to stderr |
| `--space-id` | Space ID to use for certain space-scoped commands |

### See also

* [apollo-cli](/docs/apollo/apollo-cli/apollo-cli/): CLI to interact with Apollo
* [apollo-cli module create](/docs/apollo/apollo-cli/apollo-cli_module_create/): Creates a new module
* [apollo-cli module diff](/docs/apollo/apollo-cli/apollo-cli_module_diff/): Diff two module definitions
* [apollo-cli module evaluate](/docs/apollo/apollo-cli/apollo-cli_module_evaluate/): Evaluates a module definition to predict how it could behave when installed
* [apollo-cli module flatten](/docs/apollo/apollo-cli/apollo-cli_module_flatten/): Flatten a composite module definition
* [apollo-cli module get](/docs/apollo/apollo-cli/apollo-cli_module_get/): Get a single Apollo module by product ID
* [apollo-cli module install](/docs/apollo/apollo-cli/apollo-cli_module_install/): Install a module into an Apollo environment
* [apollo-cli module list](/docs/apollo/apollo-cli/apollo-cli_module_list/): List Apollo modules
* [apollo-cli module lock](/docs/apollo/apollo-cli/apollo-cli_module_lock/): Generate a lock file for the full module definition including all submodules
* [apollo-cli module update](/docs/apollo/apollo-cli/apollo-cli_module_update/): Updates the revisions of every submodule to latest
