---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e7c22390a6c18c3818c498a107ffbd84bbe43ef18387de50abeadf091b3ead6d"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product-release"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product-release

Manage Apollo product releases

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for product-release |

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
* [apollo-cli product-release asset](/docs/apollo/apollo-cli/apollo-cli_product-release_asset/): Commands for working with assets
* [apollo-cli product-release create](/docs/apollo/apollo-cli/apollo-cli_product-release_create/): Creates a new product release in Apollo from an Apollo product manifest file or a product TGZ
* [apollo-cli product-release get](/docs/apollo/apollo-cli/apollo-cli_product-release_get/): Get one or more product releases
* [apollo-cli product-release helm-chart](/docs/apollo/apollo-cli/apollo-cli_product-release_helm-chart/): Manage a helm-chart product-release
* [apollo-cli product-release init](/docs/apollo/apollo-cli/apollo-cli_product-release_init/): Initializes the Apollo artifacts for a new product release
* [apollo-cli product-release list](/docs/apollo/apollo-cli/apollo-cli_product-release_list/): List product releases
* [apollo-cli product-release terraform](/docs/apollo/apollo-cli/apollo-cli_product-release_terraform/): Commands for working with terraform
* [apollo-cli product-release verify](/docs/apollo/apollo-cli/apollo-cli_product-release_verify/): Verifies that the specified manifest is valid
