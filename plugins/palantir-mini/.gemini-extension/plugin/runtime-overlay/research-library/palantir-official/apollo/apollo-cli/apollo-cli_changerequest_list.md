---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_list/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_list/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bff8ca5336b1b88c98221684cbd4338d79a94d0916844868444c44f555774032"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli changerequest list"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli changerequest list

List change requests

List change requests with optional filters.

Valid status values: PENDING\_APPROVALS, APPROVED, REJECTED, CANCELLED, ERROR, APPROVED\_APPLYING, APPROVED\_MERGED

```bash
apollo-cli changerequest list [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--author` | Filter by author user ID |
| `--environment` | Filter by environment ID |
| `-h`, `--help` | Help for list |
| `--limit` | Maximum number of results to return |
| `--space-id` | Space ID (required) |
| `--status` | Filter by status (e.g., PENDING\_APPROVALS, APPROVED, REJECTED, CANCELLED) |
| `--title` | Filter by title |

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

* [apollo-cli changerequest](/docs/apollo/apollo-cli/apollo-cli_changerequest/): Interact with Apollo change requests
