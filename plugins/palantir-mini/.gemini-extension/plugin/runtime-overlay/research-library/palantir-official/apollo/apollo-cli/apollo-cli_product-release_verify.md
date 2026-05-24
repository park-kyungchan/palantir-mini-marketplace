---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_verify/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_verify/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "abc76a0710688552f0c2e2e66615c4938793dc0a4fe628dc1d373996d608ae87"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product-release verify"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product-release verify

Verifies that the specified manifest is valid

Verifies that the specified manifest is valid. If the specified file has the extension ".tgz" or ".tar.gz"
then the file at \*/deployment/manifest.yml is verifies; otherwise, the file is verified directly.

```bash
apollo-cli product-release verify [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--dry-run` | Print the operations that would be performed |
| `-h`, `--help` | Help for verify |
| `--manifest` | Path to file with the manifest to verify (manifest file or product TGZ that contains manifest) |
| `--print-manifest` | Print the manifest |

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

* [apollo-cli product-release](/docs/apollo/apollo-cli/apollo-cli_product-release/): Manage Apollo product releases
