---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_check/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_check/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "af86a95dd39b26cfe89eee335758222358c65203a17c3cfcf4dad5e55a3797b9"
product: "apollo"
docsArea: "apollo-cli"
locale: "en"
upstreamTitle: "Documentation | Apollo CLI > apollo-cli cve check"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
<!-- This file is auto-generated in the apollo-cli repo by ./godelw generate. Do not update manually! -->

# apollo-cli cve check

Check product releases for security vulnerabilities and CVE scan status

Check product releases for security vulnerabilities and CVE scan status.

This command collects product release coordinates from one or more sources and checks
each one against Apollo APIs to determine:

* Whether the release has been recalled due to SECURITY\_VULNERABILITY
* When the last CVE scan was performed
* Active CVEs affecting the release

Input sources (at least one required):

1. An environment (-e): Check all product releases from entities in the environment
2. A YAML file (-f): Check Maven coordinates listed in the provided YAML file
3. A product ID (-p): Check all releases for the specified product

If multiple sources are provided, the releases are merged before checking.

Use -r/--release-channel to filter results by release channel:

* For environment sources: Only include entities on the specified release channel
* For product ID sources: Only include releases on the specified release channel

Use --rescan to trigger CVE rescans for releases that haven't been scanned in the past 7 days.
Use --details to show detailed CVE information including per-release breakdowns.

Example YAML file (coordinates.yaml):

* com.palantir.storage\:storage-controller:1.1811.0
* com.palantir.foo\:bar:1.0.0

Example usage:

# Check CVE status for releases in a YAML file

apollo-cli cve check -f coordinates.yaml

# Check CVE status for all releases in an environment

apollo-cli cve check -e my-environment

# Check CVE status for all releases of a specific product

apollo-cli cve check -p com.palantir.foo:bar

# Combine sources and trigger rescans

apollo-cli cve check -e my-environment -f extra-coords.yaml --rescan

# Filter by release channel

apollo-cli cve check -e my-environment -r RELEASE

# Show detailed CVE information

apollo-cli cve check -e my-environment --details

```bash
apollo-cli cve check [flags]
```

### Flags

| Flag                      | Use                      |
| ------------------------- | ------------------------ |
| `--details` | Show detailed output including per-release CVE information |
| `-e`, `--environment` | Environment |
| `-h`, `--help` | Help for check |
| `-f`, `--maven-coordinates-file` | File containing a list of maven coordinates (yaml format) |
| `-p`, `--product-id` | Product ID of the form 'group:product' |
| `-r`, `--release-channel` | Release channel |
| `--rescan` | Trigger CVE rescan for releases not scanned in the past 7 days |

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

* [apollo-cli cve](/docs/apollo/apollo-cli/apollo-cli_cve/): Check product releases for security vulnerabilities
