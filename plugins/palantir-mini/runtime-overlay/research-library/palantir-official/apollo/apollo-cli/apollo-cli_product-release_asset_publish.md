---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_asset_publish/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_asset_publish/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5dacdbdd94a796cb797da281ed6093c73c07ea79636718e8e6ce34d8a35aa6b5"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli product-release asset publish"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli product-release asset publish

Creates and publishes an asset product TGZ to Apollo.

Creates an asset product TGZ with the provided Maven coordinate. The asset subdirectory contents are taken from the specified local directory. The command then publishes both the asset TGZ and its product release to Apollo using the specified publisher parameters. If you want to publish a product to an enrollment you are not a member of the primary org for, then set the spaceID for the enrollment using the global '--space-id' flag.

```bash
apollo-cli product-release asset publish [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--asset-path` | File or directory to include in the published asset |
| `-h`, `--help` | Help for publish |
| `--images` | Container image URIs that enable Apollo to know which images it needs to check for availability before recommending an upgrade to a containerized entity. |
| `--label-name` | Name of the label added to the product release |
| `--label-value` | Value of the label added to the product release |
| `--manifest-extension` | Extension of the manifest file |
| `--manifest-extension-key` | Key of the manifest extension |
| `--manifest-extension-value` | Value of the manifest extension |
| `--manifest-file` | Manifest file |
| `--maven-coordinate` | Maven coordinate for the artifact |

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

* [apollo-cli product-release asset](/docs/apollo/apollo-cli/apollo-cli_product-release_asset/): Commands for working with assets
