---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_export/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_export/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9e57397a0d2e65f4b2b7e702ab9719b9c19548455081e6521b97ac4b6b26bf5e"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli release-channel export [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli release-channel export \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Export all product releases from a release channel to a YAML file

Export all product releases from a specified release channel to a YAML file.

This command fetches all products in the space, then for each product queries
releases on the specified release channel. The output file contains Maven
coordinates that can be used with 'apollo-cli release-channel add -f' or
'apollo-cli release-channel import' to add releases to another release channel.

Example usage:

# Export releases from MY\_CHANNEL to releases.yaml

apollo-cli release-channel export MY\_CHANNEL -o releases.yaml

# Export to a specific directory

apollo-cli release-channel export STABLE -o output/stable-releases.yaml

# Export only the latest version of each product

apollo-cli release-channel export MY\_CHANNEL -o releases.yaml --latest

Output file format (YAML):

* com.example\:foo:1.0.0
* com.example\:bar:2.3.4

```bash
apollo-cli release-channel export <release-channel> [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-h`, `--help` | Help for export |
| `-l`, `--latest` | Export only the latest version for each product |
| `-o`, `--output` | Output file path |

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
| `--profile` | Use a specific profile from your configuration file |
| `--quiet` | Do not print log output to stderr |
| `--space-id` | Space ID to use for certain space-scoped commands |

### See also

* [apollo-cli release-channel](/docs/apollo/apollo-cli/apollo-cli_release-channel/): Manage Apollo Release Channels
