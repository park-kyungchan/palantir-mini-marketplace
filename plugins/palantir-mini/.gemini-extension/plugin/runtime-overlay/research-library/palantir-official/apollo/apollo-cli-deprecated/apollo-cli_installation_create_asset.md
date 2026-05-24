---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli-deprecated/apollo-cli_installation_create_asset/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli-deprecated/apollo-cli_installation_create_asset/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "224b52c8df1aacac97d562f330a1e87820c5b9c0b62988f0babeb7636b683c57"
product: "apollo"
docsArea: "apollo-cli-deprecated"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI [Deprecated] > apollo-cli installation create asset [Deprecated]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli installation create asset \[Deprecated]

:::callout{theme="warning"}
This command is [Deprecated](/docs/apollo/apollo-references/developer-api-limited-support-policies/).
This command is deprecated and will be removed in December 2025. Use [apollo-cli entity install](/docs/apollo/apollo-cli/apollo-cli_entity_install/) instead.
:::

Creates configuration change requests to install assets to an Apollo environment

```bash
apollo-cli installation create asset [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--group-id` | Group ID which assets will be added to |
| `-h`, `--help` | Help for asset |
| `--products` | Apollo product names |

### Flags inherited from parent commands

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--apollo-client-id` | Client ID to use for generating Bearer Token |
| `--apollo-client-secret` | Client secret to use for generating Bearer Token |
| `--apollo-token` | Bearer Token to use for authenticated endpoints |
| `--apollo-token-provider` | Specifies how the Bearer Token used for authenticated Apollo endpoint calls is provided. Valid values are "auto", "static", or "service-user" (default "auto"). If "auto" is specified, will use either the Bearer Token provided by "apollo-token" or a Bearer Token obtained by using "apollo-client-id" and "apollo-client-secret" to generate a token from Multipass depending on which values are set (but will error if both values are set). If "static" is specified, the token provided by "apollo-token" is used. If "service-user" is specified, "apollo-client-id" and "apollo-client-secret" are used to generate a token from Multipass. |
| `--apollo-url` | Base URL for Apollo that is used to derive the API endpoints |
| `--debug` | Enable debug level logging |
| `--environment` | Environment |
| `--http-timeout` | Timeout in minutes for all apollo requests |
| `-k`, `--insecure-skip-verify` | Skip verification of server certificate |
| `--namespace` | Namespace |
| `-o`, `--output` | Output format (json,yaml,pretty) |
| `--profile` | Use a specific profile from your configuration file |
| `--quiet` | Do not print log output to stderr |
| `--space-id` | Space ID to use for certain space-scoped commands |

### See also

* [apollo-cli installation create](/docs/apollo/apollo-cli-deprecated/apollo-cli_installation_create/): Creates configuration change requests to add installations to an Apollo environment
