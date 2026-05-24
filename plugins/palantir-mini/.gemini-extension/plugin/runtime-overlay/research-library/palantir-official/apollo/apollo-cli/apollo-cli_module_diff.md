---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_diff/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_module_diff/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "446135979134316a56326d21d8095b4801b128dca5e51e19ff398834f9fa4929"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli module diff [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli module diff \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Diff two module definitions

Diff two module definitions. If only one module definition is provided, the module definition file provided by --file will be compared against the latest revision for the module in Apollo. If the two modules are the same, no output will be produced. If the two modules are different, the differences will be printed on a per entity basis.

```bash
apollo-cli module diff -f <module-definition-file> [-f <other-module-definition-file>] [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-f`, `--file` | Input file |
| `-h`, `--help` | Help for diff |

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

* [apollo-cli module](/docs/apollo/apollo-cli/apollo-cli_module/): Manage Apollo modules
