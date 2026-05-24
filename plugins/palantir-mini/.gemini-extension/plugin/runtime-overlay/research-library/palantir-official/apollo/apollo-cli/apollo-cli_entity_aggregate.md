---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_aggregate/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_aggregate/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4ca4281c03555ce5639849546af4bb1c0064364845dc1f6af4a2743ac9168cba"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli entity aggregate [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli entity aggregate \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Aggregate entities from all environments into a unified entity list

Fetch entity data from all Apollo environments, transform entity IDs, and merge
into a unified entity list.

This command:

1. Lists all environments in the Apollo space
2. Fetches entities from each environment
3. Saves per-environment YAML files to the output directory
4. Transforms entity IDs to use a common target environment
5. Merges entities with the same transformed ID, combining versions
6. Sets the specified release channel on all merged entities
7. Writes the unified entity list to all\_entities.yaml

The --generate-versions flag creates product-versions.yaml with all versions per product.
The --generate-lowest flag creates lowest-versions.yaml with the lowest version per product.

Example usage:

# Aggregate entities to output directory with STABLE release channel

apollo-cli entity aggregate -r STABLE --output-dir ./aggregate-output

# Aggregate with version reports

apollo-cli entity aggregate -r STABLE --output-dir ./aggregate-output --generate-versions --generate-lowest

```bash
apollo-cli entity aggregate [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--generate-lowest` | Generate lowest-versions.yaml with lowest version per product |
| `--generate-versions` | Generate product-versions.yaml with all versions per product |
| `-h`, `--help` | Help for aggregate |
| `--output-dir` | Directory where artifacts are written |
| `-r`, `--release-channel` | Release channel |

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

* [apollo-cli entity](/docs/apollo/apollo-cli/apollo-cli_entity/): Manage Apollo entities
