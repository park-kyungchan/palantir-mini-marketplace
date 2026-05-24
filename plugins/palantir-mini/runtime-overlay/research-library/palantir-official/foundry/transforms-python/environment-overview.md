---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python/environment-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python/environment-overview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c18a234edff8449307fc1795abc08c8bb6f1a85486044f775a35781b2f96023b"
product: "foundry"
docsArea: "transforms-python"
locale: "en"
upstreamTitle: "Documentation | Python environment > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Python environment

The **Python environment** used for a transform is resolved during Checks using the Hawk package manager based on the specified list of packages in the [`conda_recipe/meta.yaml`](/docs/foundry/transforms-python/project-structure/#metayaml) file. Using the package tab, you can [discover available packages and automatically add these to your `meta.yml` for environment resolution](/docs/foundry/transforms-python/use-python-libraries/). This resolved environment is published internally to Artifacts ready for use during the build.

When the transform is built, it fetches the environment file and installs the required packages specified in the environment file. If this fails for some reason, the transform will fall back to resolving the environment again during the build using Hawk.

### Useful resources

See [Introduction to Environment Creation](/docs/foundry/transforms-python/environment-creation-overview/) for an introduction to using Conda, Mamba, and Hawk to create environments. For general troubleshooting of common environment problems, see [Environment Troubleshooting Guide](/docs/foundry/transforms-python/environment-troubleshooting/).
