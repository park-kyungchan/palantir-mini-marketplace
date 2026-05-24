---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_config_apply/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_config_apply/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "56bbb0a75abe4c06abb75fdcc93e58fbd5fd7a21db45477a4cd27b4e148119e5"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli environment config apply"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli environment config apply

Creates a CR to set environment config

Creates a change request to apply the configuration specified by the user in one of the following ways:

1. By specifying --environment-config to set the environment config from a given file.
2. By specifying --config-dir to apply all configurations from a given directory.

```bash
apollo-cli environment config apply [environment-id] [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--config-dir` | Path to a directory containing config files for the environment |
| `--description` | Description of the change request |
| `--environment-config` | Path to a YML file containing the environment config to set |
| `-h`, `--help` | Help for apply |
| `--title` | Title of the change request |

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

* [apollo-cli environment config](/docs/apollo/apollo-cli/apollo-cli_environment_config/): Manage Apollo Environment Config
