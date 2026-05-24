---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_helm-chart_validate/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_helm-chart_validate/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cf585021e9d0d709d7372c55a2bf857a9b307b0ab41e8aaf02155afecf454d59"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli helm-chart validate [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli helm-chart validate \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Runs a set of validation checks on the supplied helm chart to ensure compatibility with an Apollo environment

```bash
apollo-cli helm-chart validate [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--ca-file` | Helm pull: verify certificates of HTTPS-enabled servers using this CA bundle |
| `--cert-file` | Helm pull: identify HTTPS client using this SSL certificate file |
| `--chart-path` | Path to either a local packaged chart or an unpacked chart directory |
| `-h`, `--help` | Help for validate |
| `--key-file` | Helm pull: identify HTTPS client using this SSL key file |
| `--name` | Helm chart name. If the chart resides in a remote OCI repository, this must be the full OCI URL (e.g. oci://repo/chartName) |
| `--pass-credentials` | Helm pull: pass credentials to all domains |
| `--password` | Helm pull: chart repository password where to locate the requested chart |
| `--repository-url` | Helm repository URL where the requested chart can be located |
| `--username` | Helm pull: chart repository username where to locate the requested chart |
| `--values` | Helm template: Specify values in a YAML file.  Note that values are only used to render chart templates locally.  Default configs will need to be added in Apollo before installation. |
| `--version` | Helm chart version |

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

* [apollo-cli helm-chart](/docs/apollo/apollo-cli/apollo-cli_helm-chart/): Apollo-specific helm chart utilities
