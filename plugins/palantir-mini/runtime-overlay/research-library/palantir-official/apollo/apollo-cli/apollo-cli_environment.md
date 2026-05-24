---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_environment/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8469c2fb533f61ed5ef70728751baa3dc8c23fa43b2722370b107dba30ca4938"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli environment

Manage Apollo Environments

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for environment |

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
* [apollo-cli environment config](/docs/apollo/apollo-cli/apollo-cli_environment_config/): Manage Apollo Environment Config
* [apollo-cli environment create](/docs/apollo/apollo-cli/apollo-cli_environment_create/): Creates a new Apollo Environment
* [apollo-cli environment delete](/docs/apollo/apollo-cli/apollo-cli_environment_delete/): Opens a change request to delete an Apollo Environment
* [apollo-cli environment get](/docs/apollo/apollo-cli/apollo-cli_environment_get/): Get a single Environment
* [apollo-cli environment list](/docs/apollo/apollo-cli/apollo-cli_environment_list/): List Environments
* [apollo-cli environment manifest](/docs/apollo/apollo-cli/apollo-cli_environment_manifest/): Commands to generate a manifest for an Environment
* [apollo-cli environment release-channel](/docs/apollo/apollo-cli/apollo-cli_environment_release-channel/): Manage release channel for an Apollo Environment
* [apollo-cli environment version](/docs/apollo/apollo-cli/apollo-cli_environment_version/): Manage entity versions in an environment
