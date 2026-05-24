---
sourceUrl: "https://www.palantir.com/docs/apollo/core/ci-publish-setup/"
canonicalUrl: "https://palantir.com/docs/apollo/core/ci-publish-setup/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9d36c4679761584585f9e302c44b2c97b11a37a8f6c348e95bcc9b4973089e4e"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Apollo > Publish to Apollo from CI"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Publish Products to Apollo from your CI pipeline

Once you have access to your Apollo Hub, the next step is to start publishing your services as [Products](/docs/apollo/core/products-releases-versions/#products) that Apollo will then deploy.

Publishing a Product to Apollo is meant to be a straightforward command that you can add to your Continuous Integration (CI) solution.

This guide will walk through how to publish to Apollo from a CI pipeline so that new Product Releases are added to the [Product catalog](/docs/apollo/core/products-releases-versions/#product-catalog) each time new changes are committed to your service.

## Prerequisites

### Access token

You will need either a Bearer Token or a client ID and client secret to run Apollo CLI commands in your CI pipeline.

If you are using a Bearer Token, you should add the token as a secret named `APOLLO_TOKEN` to your CI pipeline so that the value is available in the CI script.

[Learn more about configuring authentication for the Apollo CLI.](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#authentication)

### Make `apollo-cli` accessible in your CI pipeline

Because you will publish to Apollo using the `apollo-cli`, you will need to make sure the CLI is installed during the CI step to publish your Product. The CLI is a general-purpose tool used to list Product Releases, create artifacts, and publish Products to Apollo.

There are four ways that you can ensure the CLI is downloaded and accessible when you run your CI job:

* \[Recommended] Download the CLI directly from your Hub during your CI job using the following command. If you are authenticating using a service user instead of a Bearer Token, there will be an additional step.

<details>
    <summary>Additional step when using a service user</summary>
When authenticating with a service user, you must run the following command to obtain a Bearer Token. For the <code>client_id</code> and <code>client_secret</code> fields, enter your service user's credentials. This command will save the Bearer Token to a variable named <code>APOLLO_TOKEN</code> that you can then reference when running the subsequent command to download the Apollo CLI.

```bash
APOLLO_TOKEN=$(
    curl -v -s "https://<Hub>.palantircloud.com/multipass/api/oauth2/token" \
    -H 'content-type: application/x-www-form-urlencoded' \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    | grep -o '"access_token":\s*"[^"]*"' \
    | sed -E 's/"access_token":\s*"([^"]*)"/\1/' \
)
```

</details>

```bash
curl -o apollo-cli -H "authorization: Bearer $APOLLO_TOKEN" "https://<Hub>.palantircloud.com/assets/dyn/apollo-cli/bin/<os_distribution>/apollo-cli"
```

* Download the `apollo-cli` binary from your Hub and host it somewhere that is accessible to the CI virtual machine.
* Commit the CLI binary directly to your code repository.
* Build a Docker image that includes the CLI to use in your CI step.

## Publishing with `apollo-cli`

Use the `apollo-cli product-release create` command to publish to Apollo from your CI pipeline. The following flags are required when publishing any product type:

* `--apollo-url`: The URL for your Apollo Hub instance.
* `--apollo-token`: The prerequisite Bearer Token you created in the previous step. Do not include this parameter if you are using a service account.
* `--apollo-client-id`: The client ID for a service account. Do not include this parameter if you are using a Bearer Token.
* `--apollo-client-secret`: The client service for a service account. Do not include this parameter if you are using a Bearer Token.
* `--maven-coordinate`: A unique identifier that refers to a specific version of a Product. Maven Coordinates are of the form `groupID:artifactID:version`.

When publishing a Helm chart, you are required to specify the artifact repository where your chart is hosted using the `--helm-repository-url` flag. This repository can be your Hub’s artifact store or a separate, external store, like an existing Artifactory or Harbor instance. You will also need to set `-—maven-coordinate`, the unique identifier for the Release you are publishing. See the [Product Releases documentation](/docs/apollo/core/products-releases-versions/#product-releases) for more information about the identifier format.

Below is an example `apollo-cli` command that publishes a new Release of a Helm chart using a Bearer Token that has already been pushed to your Hub’s artifact repository:

```bash
./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-token $APOLLO_TOKEN --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version ${RELEASE_VERSION} --repository-url oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username $HUB_ARTIFACT_STORE_USER --password $HUB_ARTIFACT_STORE_PASS --output-dir "./chart"

./apollo-cli product-release create --manifest "./chart/manifest.yml"
```

Below is an example `apollo-cli` command that publishes a new Release of a Helm chart using a service account that has already been pushed to your Hub’s artifact repository:

```bash
./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-client-id $CLIENT_ID --apollo-client-secret $CLIENT_SECRET --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version ${RELEASE_VERSION} --repository-url=oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username $HUB_ARTIFACT_STORE_USER --password $HUB_ARTIFACT_STORE_PASS --output-dir "./chart"

./apollo-cli product-release create --manifest "./chart/manifest.yml"
```

## Example publish step for an existing CI pipeline

Here is a minimal example of a CI stage in GitLab that will publish a Helm chart that is hosted in your Hub’s artifact store. View the above command in this CI file. The full example below shows how you can push Helm charts to the Hub’s artifact store.

```yaml
publish_helm_chart_apollo:
  stage: publish_helm_chart_apollo
  image: alpine/helm:3.10.2
  dependencies:
    - build_and_push_helm_chart
  before_script:
    - apt-get update -qq && apt-get install curl git unzip -y
    - 'curl -o apollo-cli -H "authorization: Bearer $APOLLO_TOKEN" "https://<Hub>.palantircloud.com/assets/dyn/apollo-cli/bin/linux-amd64/apollo-cli"'
    - chmod 700 apollo-cli
    - export RELEASE_VERSION=$(git describe --tags)
  script:
    - ./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-token $APOLLO_TOKEN --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version=${RELEASE_VERSION} --repository-url oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username=$HUB_ARTIFACT_STORE_USER --password=$HUB_ARTIFACT_STORE_PASS --output-dir "./chart"
    - ./apollo-cli product-release create --manifest "./chart/manifest.yml"
  only:
    - tags
  except:
    - branches
```

The dependencies block allows you to reuse the Helm chart that was packaged in the `build_and_push_helm_chart` stage.

In this example, the published Apollo Release version will be `RELEASE_VERSION`, which will match the tag found in `refs/tag` for the current commit. If a SemVer format git tag was created for this commit, like 2.0.0, then `RELEASE_VERSION` will be that version number.

The `only` and `except` keys in this example configure the stage to only run on builds that correspond to a new git tag. You can remove these keys to run the publish step on every commit on a git branch where your CI pipeline is configured to run.

After running the above step in your CI pipeline, you will be able to view your Release on the home page for the corresponding Product, which can be found by navigating to the Product catalog by selecting **Products** in the left menu panel of Apollo.

## Full GitLab CI script for Product publishing

```yaml
# .gitlab-ci.yml
stages:
  - build_and_push_container
  - build_and_push_helm_chart
  - publish_helm_chart_apollo

build_and_push_container:
  stage: build_and_push_container
  image: docker:22.06.0-beta.0-git
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
    DOCKER_TLS_VERIFY: 1
    DOCKER_CERT_PATH: "$DOCKER_TLS_CERTDIR/client"
  services:
    - docker:22.06.0-beta.0-dind
  before_script:
    - sleep 5
    - docker login -u $HUB_ARTIFACT_STORE_USER -p $HUB_ARTIFACT_STORE_PASS containers-<Hub>.palantircloud.com
    - export RELEASE_VERSION=$(git describe --tags)
  script:
     - docker build -t apollo-demo-app:$RELEASE_VERSION .
     - docker tag apollo-demo-app:$RELEASE_VERSION containers-<Hub>.palantircloud.com/apollo-demo-app:$RELEASE_VERSION
     - docker push containers-<Hub>.palantircloud.com/apollo-demo-app:$RELEASE_VERSION
  only:
    - tags
  except:
    - branches

build_and_push_helm_chart:
  stage: build_and_push_helm_chart
  image: alpine/helm:3.10.2
  artifacts:
    untracked: true
  before_script:
    - export RELEASE_VERSION=$(git describe --tags)
  script:
    - cd helm-chart
    - 'sed -i "s/version:.*/version: \"${RELEASE_VERSION}\"/g" Chart.yaml'
    - 'sed -i "s/appVersion:.*/appVersion: \"${RELEASE_VERSION}\"/g" Chart.yaml'
    - 'sed -i "s/imageVersion:.*/imageVersion: \"${RELEASE_VERSION}\"/g" values.yaml'
    - helm package .
    - helm registry login -u $HUB_ARTIFACT_STORE_USER -p $HUB_ARTIFACT_STORE_PASS containers-<Hub>.palantircloud.com
    - helm push apollo-demo-chart-${RELEASE_VERSION}.tgz oci://containers-<Hub>.palantircloud.com/
  only:
    - tags
  except:
    - branches

publish_helm_chart_apollo:
  stage: publish_helm_chart_apollo
  image: alpine/helm:3.10.2
  dependencies:
    - build_and_push_helm_chart
  before_script:
    - apt-get update -qq && apt-get install curl git unzip -y
    - 'curl -o apollo-cli -H "authorization: Bearer $APOLLO_TOKEN" "https://<Hub>.palantircloud.com/assets/dyn/apollo-cli/bin/linux-amd64/apollo-cli"'
    - chmod 700 apollo-cli
    - export RELEASE_VERSION=$(git describe --tags)
  script:
    - ./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-token $APOLLO_TOKEN --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version=${RELEASE_VERSION} --repository-url oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username=$HUB_ARTIFACT_STORE_USER --password=$HUB_ARTIFACT_STORE_PASS --output-dir "./chart"
    - ./apollo-cli product-release create --manifest "./chart/manifest.yml"
  only:
    - tags
  except:
    - branches
```
