---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_append/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_append/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1cd782f6dd02566a6a326e3a4aabd6a75e4843937d89b9e9095b1f6df46cf341"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product promotion append [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product promotion append \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Append promotion pipeline stages from a template

Append promotion pipeline stages to a product's existing pipeline from a YAML template file.

This command merges template stages into the existing pipeline with conflict detection:

* Stages are identified by their source and target release channels
* Conflicting stages (same source->target) prompt for override confirmation
* Non-conflicting stages are appended to the existing pipeline

MODES:
Single product:  apollo-cli product promotion append <product-id> --file stages.yaml
Bulk (environment): apollo-cli product promotion append --environment <env-id> --file stages.yaml

CONFLICT RESOLUTION:
\--dry-run    Preview changes without applying (shows "would override" for conflicts)
\--override   Auto-override all conflicts without prompting
(default)    Interactive prompt for each conflict

Example template file (stages.yaml):
stages:
\- sourceReleaseChannel: BETA
targetReleaseChannel: RELEASE
stage:
type: zeroCanary
zeroCanary:
soakTime: "PT1440M"
productLabelConditions:
\- labelId: "security.palantir.build/approved"
onlyPossibleLabelValues: \["true"]

Example:

# Append stages to a single product's pipeline

apollo-cli product promotion append com.example:my-product --file stages.yaml

# Preview changes without applying (dry run)

apollo-cli product promotion append com.example:my-product --file stages.yaml --dry-run

# Append stages to all products in an environment

apollo-cli product promotion append --environment my-env-id --file stages.yaml

# Auto-override conflicts without prompting

apollo-cli product promotion append --environment my-env-id --file stages.yaml --override

```bash
apollo-cli product promotion append [product-id] [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--dry-run` | Print the operations that would be performed |
| `-e`, `--environment` | Environment |
| `-f`, `--file` | A single input file |
| `-h`, `--help` | Help for append |
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
