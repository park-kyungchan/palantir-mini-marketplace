---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "99a088041baa16e810cb9d81713e034a7912ea19528b9adf0fefdc66d0b73565"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product promotion [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product promotion \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Manage Apollo product promotion pipelines

Manage promotion pipelines for Apollo products.

Promotion pipelines automate the process of promoting product releases through
release channels based on configurable conditions and stages.

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for promotion |

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

* [apollo-cli product](/docs/apollo/apollo-cli/apollo-cli_product/): Interact with Apollo products
* [apollo-cli product promotion append](/docs/apollo/apollo-cli/apollo-cli_product_promotion_append/): Append promotion pipeline stages from a template
* [apollo-cli product promotion disable](/docs/apollo/apollo-cli/apollo-cli_product_promotion_disable/): Disable the promotion pipeline for a product
* [apollo-cli product promotion enable](/docs/apollo/apollo-cli/apollo-cli_product_promotion_enable/): Enable the promotion pipeline for a product
* [apollo-cli product promotion get](/docs/apollo/apollo-cli/apollo-cli_product_promotion_get/): Get promotion pipeline configuration for a product
* [apollo-cli product promotion set](/docs/apollo/apollo-cli/apollo-cli_product_promotion_set/): Set or update the promotion pipeline from a configuration file
