---
sourceUrl: "https://www.palantir.com/docs/foundry/code-repositories/artifact-repositories-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/code-repositories/artifact-repositories-overview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7b10c1df6f867e8e76090bfdcb204c5253c821002b5e1421e9b4b3109d581261"
product: "foundry"
docsArea: "code-repositories"
locale: "en"
upstreamTitle: "Documentation | Artifact repositories > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Artifact repositories

Artifact repositories enable users to publish and manage Artifacts, including [Conda ↗](https://docs.conda.io/en/latest/), [Docker ↗](https://www.docker.com/), and [Maven ↗](https://maven.apache.org/what-is-maven.html).

Artifact repositories should be used to upload all Conda, Docker, or Maven Artifacts that are not authored as a [library](/docs/foundry/transforms-python/use-python-libraries/) or accessible through an external URL. For example, you may have written a Conda package on your local machine that you wish to access in Code Repositories. By publishing the Conda package to an Artifact repository, you will be able to access it from the **Library** search panel in [Code Repositories](/docs/foundry/code-repositories/overview/).

Key features of Artifacts repositories are:

* [**Publishing Artifacts:**](/docs/foundry/code-repositories/publish-artifact/) Generate a token and push an Artifact into an Artifact repository.
* [**Searching for Artifacts:**](/docs/foundry/code-repositories/artifact-repositories-nav/#search) Find Artifacts from the Artifact Repository interface.
* [**Recalling Conda Artifacts:**](/docs/foundry/code-repositories/recall-artifact/) Recall Conda Artifacts to prevent downstream consumers from compiling code with a specific version.

Learn more about the Artifact Repository [interface](/docs/foundry/code-repositories/artifact-repositories-nav/) and how to [create an Artifact repository](/docs/foundry/code-repositories/create-artifact-repository/).
