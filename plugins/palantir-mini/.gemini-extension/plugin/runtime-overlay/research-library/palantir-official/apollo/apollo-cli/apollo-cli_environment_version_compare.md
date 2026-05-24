---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_version_compare/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_version_compare/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f338e192738903dc8186175b6b760677d8a3ba23421ae23c684c7d5c5364905f"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli environment version compare"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli environment version compare

Compare entity versions with latest available on release channels

Compare the current versions of entities in an environment with the latest
versions available on their configured release channels.

By default, only entities that have updates available are shown. Use the --all
flag to show all entities including those that are up to date.

You can override the release channel for all entities using the -r flag.

Example usage:

# Compare entity versions in an environment

apollo-cli environment version compare apollo-env-123

# Compare with a specific release channel override

apollo-cli environment version compare apollo-env-123 -r STABLE

# Show all entities, including up-to-date ones

apollo-cli environment version compare apollo-env-123 --all

```bash
apollo-cli environment version compare <environment-id> [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--all` | Show all items including those with no changes |
| `-h`, `--help` | Help for compare |
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

* [apollo-cli environment version](/docs/apollo/apollo-cli/apollo-cli_environment_version/): Manage entity versions in an environment
