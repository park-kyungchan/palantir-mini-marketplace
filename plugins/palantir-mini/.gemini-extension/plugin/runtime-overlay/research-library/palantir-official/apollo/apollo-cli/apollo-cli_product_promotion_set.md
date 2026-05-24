---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_set/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_set/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b8688e97924076e82ee55d2c632a7e9357500aba5d69f739887f9d45af48fba2"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product promotion set [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product promotion set \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Set or update the promotion pipeline from a configuration file

Set or update the promotion pipeline configuration for a product from a YAML file.

The configuration file defines the promotion pipeline stages, including:

* Source and target release channels for each stage
* Stage type (zeroCanary or dynamic)
* Promotion conditions and thresholds

MODES:
Single product:  apollo-cli product promotion set <product-id> --file pipeline.yaml
Bulk (environment): apollo-cli product promotion set --environment <env-id> --file pipeline.yaml

Example configuration file (promotion-pipeline.yaml):
stages:
\- sourceReleaseChannel: BETA
targetReleaseChannel: RELEASE
type: zeroCanary
zeroCanary:
soakTimeInMinutes: 1440
productLabelConditions:
\- labelId: "security.palantir.build/approved"
possibleLabelValues: \["true"]
\- sourceReleaseChannel: CANARY
targetReleaseChannel: BETA
type: dynamic
dynamicConfig:
entityFilters:
\- type: environmentLabel
labelId: "env.palantir.build/tier"
possibleLabelValues: \["production"]
promotionConditions:
\- type: minHealthy
soakTimeInMinutes: 60
minHealthyThreshold:
percentage: 95.0

Example:

# Set promotion pipeline from config file (uses configured default space-id)

apollo-cli product promotion set com.example:my-product --file promotion-pipeline.yaml

# Preview changes without applying (dry run)

apollo-cli product promotion set com.example:my-product --file promotion-pipeline.yaml --dry-run

# Set with specific space ID

apollo-cli product promotion set com.example:my-product --file promotion-pipeline.yaml --space-id my-space

# Set pipeline for all products in an environment

apollo-cli product promotion set --environment my-env-id --file promotion-pipeline.yaml

# Set for all products without confirmation prompt

apollo-cli product promotion set --environment my-env-id --file promotion-pipeline.yaml --override

```bash
apollo-cli product promotion set [product-id] [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--dry-run` | Print the operations that would be performed |
| `-e`, `--environment` | Environment |
| `-f`, `--file` | A single input file |
| `-h`, `--help` | Help for set |
| `--override` | Override conflicts without prompting |
| `--space-id` | Space ID |

### Flags inherited from parent commands

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--apollo-client-id` | Client ID to use for generating Bearer Token |
| `--apollo-client-secret` | Client secret to use for generating Bearer Token |
| `--apollo-token` | Bearer Token to use for authenticated endpoints |
| `--apollo-token-provider` | Specifies how the Bearer Token used for authenticated Apollo endpoint calls is provided. Valid values are "auto", "static", or "service-user" (default "auto"). If "auto" is specified, will use either the Bearer Token provided by "apollo-token" or a Bearer Token obtained by using "apollo-client-id" and "apollo-client-secret" to generate a token from Multipass depending on which values are set (but will error if both values are set). If "static" is specified, the token provided by "apollo-token" is used. If "service-user" is specified, "apollo-client-id" and "apollo-client-secret" are used to generate a token from Multipass. |
| `--apollo-url` | Base URL for Apollo that is used to derive the API endpoints |
| `--debug` | Enable debug level logging |
| `--http-timeout` | Timeout in minutes for all apollo requests |
| `-k`, `--insecure-skip-verify` | Skip verification of server certificate |
| `-o`, `--output` | Output format (json,yaml,pretty) |
| `--profile` | Use a specific profile from your configuration file |
| `--quiet` | Do not print log output to stderr |

### See also

* [apollo-cli product promotion](/docs/apollo/apollo-cli/apollo-cli_product_promotion/): Manage Apollo product promotion pipelines
