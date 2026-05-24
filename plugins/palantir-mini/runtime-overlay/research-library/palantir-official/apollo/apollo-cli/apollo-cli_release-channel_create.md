---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_create/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_create/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5c76691b1b88b94088b57285819970d7e03f84db6a2a55405ccd7f9babf35101"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli release-channel create [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli release-channel create \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Create a new release channel

Creates a new release channel with the given name and description.

Example:

# Create a release channel

apollo-cli release-channel create MY\_CHANNEL --description "My custom release channel"

# Create a release channel with a label requirement (label must exist, no specific value required)

apollo-cli release-channel create MY\_CHANNEL --description "Requires security scan" \
\--label-requirement "vulnerability-scanner.palantir.build/security-scanned"

# Create a release channel with a label requirement (label must have specific value)

apollo-cli release-channel create MY\_CHANNEL --description "Requires specific approval" \
\--label-requirement-value "approval.palantir.build/approved=true"

# Use --space-id for omniscient mode

apollo-cli release-channel create MY\_CHANNEL --description "My channel" --space-id my-space-id

```bash
apollo-cli release-channel create <channel-name> [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--description` | Description of the release channel (required) |
| `-h`, `--help` | Help for create |
| `--label-requirement` | Label ID that must exist on product releases (can be specified multiple times) |
| `--label-requirement-value` | Label ID with required value in format 'labelId=value' (can be specified multiple times) |

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

* [apollo-cli release-channel](/docs/apollo/apollo-cli/apollo-cli_release-channel/): Manage Apollo Release Channels
