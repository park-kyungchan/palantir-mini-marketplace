---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_install/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_module_install/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3ffea3b416d3253e011167b5f5c9b9bab22d6adf4f29eba9c61163e92e265aac"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli module install [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli module install \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Install a module into an Apollo environment

Install a module into an Apollo environment. Accepts either a product ID (e.g. 'module:example-module', which will install the latest release on the resolved release channel) or a full maven coordinate (e.g. 'module\:example-module:0.5.0', which will install that specific version). If the module is already installed on the environment, the existing module installation will be updated

```bash
apollo-cli module install <module-product-id-or-maven-coordinate> [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `-e`, `--environment` | Environment |
| `-h`, `--help` | Help for install |
| `--ignore-recalls` | Allow module installation to proceed even if all releases of a product are recalled |
| `--ignore-secret-requirements` | Allow module installation to proceed even if the secrets the module requires have not been set |
| `-r`, `--release-channel` | Release channel |
| `--variable` | Module variables of the form KEY=VALUE. Can be specified multiple times |

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
| `--space-id` | Space ID to use for certain space-scoped commands |

### See also

* [apollo-cli module](/docs/apollo/apollo-cli/apollo-cli_module/): Manage Apollo modules
