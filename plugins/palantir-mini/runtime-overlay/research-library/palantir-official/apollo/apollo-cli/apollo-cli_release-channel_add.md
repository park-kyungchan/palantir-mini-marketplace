---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_add/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_add/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4cea7e5e8bb476624b9626b501f241c72dd9e202012971ee9ed3bb241dab7ac5"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli release-channel add [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli release-channel add \[Experimental]

:::callout{theme="neutral"}
This command is [Experimental](/docs/apollo/apollo-references/developer-api-limited-support-policies/). To [enable this command](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command and enable `V2 experimental commands`.
:::

Add reported versions from an environment and/or a YAML file of Maven coordinates to a Release Channel

Add versions to a specified Release Channel from one or more of the following sources:

1. An environment: For every Entity reporting a Product Release version in the specified environment.
2. A YAML file: For every Maven coordinate listed in the provided YAML file.
3. A bundle: For every Product Release contained in a bundle

If multiple sources (environment, file, bundle) are provided, the releases are merged before being added.

You may also skip all interactive prompts using the '-y' or '--yes' flag.

Example of a YAML file (my-coordinates.yml):

* com.example\:foo:1.0.0
* com.example\:bar:2.3.4

```bash
apollo-cli release-channel add [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--bundle-rid` | The rid of a bundle |
| `-e`, `--environment` | Environment |
| `-h`, `--help` | Help for add |
| `-f`, `--maven-coordinates-file` | File containing a list of maven coordinates (yaml format) |
| `--payload-bundler-base-url` | Base URL path segment of the payload bundler service (e.g., 'payload-bundler' for production, 'dev-payload-bundler' for development). For a full URL like 'https://my-apollo-url.com/dev-payload-bundler/api/bundles/v2/...', you would specify 'dev-payload-bundler'. |
| `-r`, `--release-channel` | Release channel |
| `-y`, `--yes` | Assume 'yes' for all confirmations |

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

* [apollo-cli release-channel](/docs/apollo/apollo-cli/apollo-cli_release-channel/): Manage Apollo Release Channels
