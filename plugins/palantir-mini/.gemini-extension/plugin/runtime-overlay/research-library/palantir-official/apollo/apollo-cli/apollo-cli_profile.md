---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_profile/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9e34fe628cdb0199506e86a3d184c8a6f3e489a1ba571a816b0055ce1ac4ce59"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli profile [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli profile \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Manage Apollo CLI configuration profiles

Manage multiple configuration profiles for different Apollo environments.

Profiles allow you to save and switch between different Apollo configurations
(URLs, credentials, default environments) without manually editing config files.

Examples:

# List all profiles

apollo profile list

# Switch to a different profile

apollo profile use production

# Create a new profile interactively

apollo profile create staging

# Use a profile for a single command

apollo --profile production environment list

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for profile |

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
* [apollo-cli profile create](/docs/apollo/apollo-cli/apollo-cli_profile_create/): Create a new profile
* [apollo-cli profile delete](/docs/apollo/apollo-cli/apollo-cli_profile_delete/): Delete a profile
* [apollo-cli profile export](/docs/apollo/apollo-cli/apollo-cli_profile_export/): Export a profile to a file
* [apollo-cli profile import](/docs/apollo/apollo-cli/apollo-cli_profile_import/): Import a profile from a file
* [apollo-cli profile list](/docs/apollo/apollo-cli/apollo-cli_profile_list/): List all configured profiles
* [apollo-cli profile rename](/docs/apollo/apollo-cli/apollo-cli_profile_rename/): Rename a profile
* [apollo-cli profile show](/docs/apollo/apollo-cli/apollo-cli_profile_show/): Show configuration for a profile
* [apollo-cli profile use](/docs/apollo/apollo-cli/apollo-cli_profile_use/): Set the active profile
