---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_cancel/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_cancel/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4f91164f4e3546930f314d5273570cc916687503fe0aea22e0ff88a97f0ed8e4"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli changerequest cancel"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli changerequest cancel

Cancel a pending change request

```bash
apollo-cli changerequest cancel <request-rid> [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--dry-run` | Print what would be done without making changes |
| `-h`, `--help` | Help for cancel |

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

* [apollo-cli changerequest](/docs/apollo/apollo-cli/apollo-cli_changerequest/): Interact with Apollo change requests
