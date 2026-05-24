---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-references/experimental-end-to-end-workflow/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-references/experimental-end-to-end-workflow/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "005bbd967c3f56673b75a833c374a12d6b83563d2bdaa9be71953a41f7629c1f"
product: "apollo"
docsArea: "apollo-references"
locale: "en"
upstreamTitle: "Documentation | Workflows > End-to-end workflow [Experimental]"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# End-to-end workflow \[Experimental]

:::callout{theme="neutral"}
The commands used in this workflow are [Experimental](developer-api-limited-support-policies.md#experimental). To [enable these commands](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#configure-experimental-and-deprecated-commands), run the `apollo-cli configure` command.
:::

This guide will walk through how to:

1. [Create a new Environment](/docs/apollo/apollo-cli/apollo-cli_environment_create/)
2. [Install the Apollo Control Plane Module into the Environment](/docs/apollo/apollo-cli/apollo-cli_module_install/)
3. [Generate the Environment manifest and apply it to a Kubernetes cluster](/docs/apollo/apollo-cli/apollo-cli_environment_manifest_generate/)
4. [Initialize a new Helm chart Product manifest](/docs/apollo/apollo-cli/apollo-cli_product-release_helm-chart_init/)
5. [Create a new Product Release from the Product manifest](/docs/apollo/apollo-cli/apollo-cli_product-release_create/)
6. [Install the new Product Release in the Environment](/docs/apollo/apollo-cli/apollo-cli_entity_install/)

## Prerequisites

* You have [downloaded and configured the Apollo CLI](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/).
* You have a Kubernetes cluster. For production, you should ensure that your cluster satisfies the [Spoke Environment requirements](/docs/apollo/managing-environments/spoke-environment-prerequisites/). For testing, you can [set up a cluster using Docker and kind](/docs/apollo/core/set-up-local-kubernetes-cluster/).
* You have a Helm chart that is published to an artifact store, for example, [Amazon Elastic Container Registry (ECR) ↗](https://docs.aws.amazon.com/ecr/).
* Change requests can be auto-approved on your Apollo Hub.
* A `values.yaml` file exists your working directory for templating the Product.

## Environment variables

You should define the following environment variables at the beginning of the script:

* `ENVIRONMENT_PREFIX`: The name of your new Environment.
* `OWNER_TEAM_RID`: The RID of the Team that should own the Environment. You can find this value by navigating to the Team in Apollo and copying the RID.
* `MODULE_ID`: The ID for the Spoke Control Plane Module that you want to install in the new Environment. You can find this value by running `apollo-cli module list`. [Learn more about the available Spoke Control Plane Modules](/docs/apollo/managing-environments/connect-new-environment/).
* `NAMESPACE`: The Kubernetes namespace in which Apollo will install the Product.
* `MANIFEST_OUTPUT_DIR`: The directory where Apollo should save the generated Product manifest.
* `PRODUCT_GROUP`: The group ID for the Product.
* `PRODUCT_NAME`: The name of the Helm chart in your repository, which you can find by running `helm search repo <keyword>`.
* `PRODUCT_VERSION`: The version of the Helm chart to publishYou can find this value by running `helm search repo <keyword>`.
* `HELM_REPOSITORY_URL`: The URL where the Helm chart is hosted. You can find this value by running `helm repo list`.

## Full script

```bash
#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT_PREFIX="new-environment"
CONTACT_TEAM="my-apollo-team"
MODULE_ID="EggKnW549ZC:35"
NAMESPACE="example-namespace"
MANIFEST_OUTPUT_DIR=$PWD
PRODUCT_GROUP="com.palantir.example"
PRODUCT_NAME="test-helm-chart"
PRODUCT_VERSION="0.186.0"
HELM_REPOSITORY_URL="oci://docker.external.repository.build/example/charts/test-helm-chart"

# 1. Create a new Environment
ENVIRONMENT_ID=$(apollo-cli environment create "$ENVIRONMENT_PREFIX" --contact-team "$CONTACT_TEAM" -ojson | jq -r '.apolloEnvironmentID')

# 2. Install the Apollo Control Plane Module into the Environment
apollo-cli module install \
    --module-id $MODULE_ID \
    --environment "$ENVIRONMENT_ID" \
    --variable environmentId="$ENVIRONMENT_ID"

# 3. Generate the Environment manifest and apply it to a Kubernetes cluster
echo "Press enter to generate the environment manifest and apply it to the k8s cluster"
read
apollo-cli environment manifest generate "$ENVIRONMENT_ID" | kubectl apply -f -

# 4. Initialize a new Helm chart Product manifest
apollo-cli product-release helm-chart init \
    --repository-url "$HELM_REPOSITORY_URL" \
    --maven-coordinate "${PRODUCT_GROUP}:${PRODUCT_NAME}:${PRODUCT_VERSION}" \
    --name "$HELM_REPOSITORY_URL" \
    --version "$PRODUCT_VERSION" \
    --values values.yaml \
    --output-dir "$MANIFEST_OUTPUT_DIR"

# 5. Create a new Helm chart Product Release
apollo-cli product-release create --manifest "$MANIFEST_OUTPUT_DIR"/manifest.yml

# 6. Install the new Helm chart Product Release in the Environment
apollo-cli entity install \
    --environment "$ENVIRONMENT_ID" \
    --product-id "${PRODUCT_GROUP}:${PRODUCT_NAME}"
```
