---
source: https://www.palantir.com/docs/apollo/core/ci-publish-setup
fetched: 2026-04-20
section: security-deployments
doc_title: .gitlab-ci.yml
---

- Apollo

  * [Documentation](/docs/foundry/)
  * [Apollo](/docs/apollo/)
  * [Gotham](/docs/gotham/)

Search

+

K

Send feedback

ABXY

ABXYABXYABXYABXYABXYABXY

* [Documentation](/docs/apollo/core/introduction/)
* [Getting started](/docs/apollo/apollo-getting-started/getting-started-with-apollo/)
* [Reference](/docs/apollo/apollo-references/apollo-references/)
* [What's New](/docs/apollo/core/whats-new/)

Documentation
-------------

* [Introduction](/docs/apollo/core/introduction/)
* [Overview](/docs/apollo/core/overview/)
* [How Apollo works](/docs/apollo/core/how-apollo-works/)
* [Supported browsers](/docs/apollo/core/supported-browsers/)
* [What's new](/docs/apollo/core/whats-new/)
* Core concepts

  + [Environments](/docs/apollo/core/environments/)
  + [Entities](/docs/apollo/core/entities/)
  + [Products, Releases, and Versions](/docs/apollo/core/products-releases-versions/)
  + [Release Channels](/docs/apollo/core/release-channels/)
  + [Modules](/docs/apollo/core/modules/)
  + [Plans and Constraints](/docs/apollo/core/plans-and-constraints/)
  + [Teams](/docs/apollo/core/teams/)
  + [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/)
  + [Apollo Agents](/docs/apollo/core/agents/)
  + [Liveness and Readiness](/docs/apollo/core/liveness-and-readiness/)
* Security

  + [Authentication](/docs/apollo/core/authentication/)
  + [Authorization](/docs/apollo/core/authorization/)
* Best practices

  + [Publishing versioned Helm charts](/docs/apollo/core/publishing-versioned-helm-charts/)
  + [Helm rollout strategies and timeouts](/docs/apollo/core/helm-rollouts/)
  + [Troubleshooting in Kubernetes clusters](/docs/apollo/core/troubleshooting-in-cluster/)
* Workflows
* Managing Teams

  + [Teams](/docs/apollo/managing-teams/overview/)
  + [Create a new team](/docs/apollo/managing-teams/create-new-team/)
  + [View or edit existing teams](/docs/apollo/managing-teams/view-edit-existing-teams/)
  + [Team contacts](/docs/apollo/managing-teams/team-contacts/)
* Managing Environments

  + [Overview](/docs/apollo/managing-environments/overview/)
  + [Spoke Environment prerequisites](/docs/apollo/managing-environments/spoke-environment-prerequisites/)
  + [Create and connect a new Apollo Environment](/docs/apollo/managing-environments/connect-new-environment/)
  + [Editing Environment management settings](/docs/apollo/managing-environments/editing-environment-management-settings/)
  + [Configure Environment settings](/docs/apollo/managing-environments/environment-settings/)
  + [Configure Environment connection settings](/docs/apollo/managing-environments/environment-connection-settings/)
  + [Configure Environment edit source](/docs/apollo/managing-environments/environment-edit-source/)
  + [Create maintenance window overrides](/docs/apollo/managing-environments/create-maintenance-window-overrides/)
  + [Suppression windows and canceling Plans](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/)
  + [Environment Config](/docs/apollo/managing-environments/environment-config/)
  + [Deleting an Environment](/docs/apollo/managing-environments/delete-environment/)
* Managing Products

  + [Overview](/docs/apollo/managing-products/overview/)
  + [Create a new Product](/docs/apollo/managing-products/create-a-new-product/)
  + [Creating Helm chart Releases](/docs/apollo/managing-products/publishing-helm-charts/)
  + [Tracking Product Releases](/docs/apollo/managing-products/tracking-product-releases/)
  + [Product maintenance windows](/docs/apollo/managing-products/product-maintenance-window/)
  + [Ramped rollouts](/docs/apollo/managing-products/ramped-rollouts/)
  + [Edit Product display metadata](/docs/apollo/managing-products/product-display-metadata/)
  + [Deleting Products and Releases](/docs/apollo/managing-products/delete-product-and-product-release/)
* Managing Changes

  + [Overview](/docs/apollo/managing-changes/overview/)
  + [Change Requests](/docs/apollo/managing-changes/change-requests/)
  + [Change Types](/docs/apollo/managing-changes/change-types/)
  + [Required Approvers](/docs/apollo/managing-changes/required-approvers/)
* Managing Entities

  + [Overview](/docs/apollo/managing-entities/overview/)
  + [Adding and Managing Entities](/docs/apollo/managing-entities/add-and-edit-entities/)
  + [Uninstalling and unmanaging Entities](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/)
  + [Reporting Entities](/docs/apollo/managing-entities/report-entities/)
  + [Setting config overrides](/docs/apollo/managing-entities/set-config-overrides/)
  + [Stopping and Starting Entities](/docs/apollo/managing-entities/stopping-and-starting-entities/)
  + [Issuing commands](/docs/apollo/managing-entities/user-issued-commands/)
  + [Prevent Product Release upgrades for an Entity](/docs/apollo/managing-entities/prevent-product-release-upgrades-for-an-entity/)
* Managing Kubernetes namespaces

  + [Overview](/docs/apollo/managing-k8s-namespaces/overview/)
  + [Create and delete a Kubernetes namespace](/docs/apollo/managing-k8s-namespaces/create-delete-k8s-namespace/)
  + [Install an Entity in a Kubernetes namespace](/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace/)
* Managing Labels

  + [Overview](/docs/apollo/managing-labels/overview/)
  + [Create labels](/docs/apollo/managing-labels/create-labels/)
  + [Entity labels](/docs/apollo/managing-labels/entity-labels/)
  + [Environment labels](/docs/apollo/managing-labels/environment-labels/)
  + [Product Release labels](/docs/apollo/managing-labels/product-release-labels/)
  + [Team labels](/docs/apollo/managing-labels/team-labels/)
* Managing Modules

  + [Overview](/docs/apollo/managing-modules/overview/)
  + [Create, edit, and delete a Module](/docs/apollo/managing-modules/create-module/)
  + [Install a Module](/docs/apollo/managing-modules/install-module/)
  + [Update a Module installation](/docs/apollo/managing-modules/update-module-installation/)
  + [Composite Modules](/docs/apollo/managing-modules/composite-modules/)
  + [Store Module definitions in Git repositories](/docs/apollo/managing-modules/git-module/)
* Managing Secrets

  + [Overview](/docs/apollo/managing-secrets/overview/)
  + [Add, edit, and delete secrets](/docs/apollo/managing-secrets/add-edit-delete-secrets/)
  + [Reference and use secrets](/docs/apollo/managing-secrets/reference-and-use-secrets/)
* Managing Release Channels

  + [Overview](/docs/apollo/managing-release-channels/overview/)
  + [Create a custom Release Channel](/docs/apollo/managing-release-channels/create-custom-release-channel/)
  + [Configure a Release promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/)
  + [Manual promotion](/docs/apollo/managing-release-channels/manual-promotion/)
* Recalling Releases

  + [Overview](/docs/apollo/recalling-releases/overview/)
  + [Issue, edit, and revert a recall](/docs/apollo/recalling-releases/recall-release/)
  + [Recall ranges](/docs/apollo/recalling-releases/recall-ranges/)
  + [Roll-off strategies](/docs/apollo/recalling-releases/roll-off-strategies/)
* Managing Vulnerabilities

  + [Overview](/docs/apollo/managing-vulnerabilities/overview/)
  + [Vulnerability scanning](/docs/apollo/managing-vulnerabilities/vulnerability-scanning/)
  + [Vulnerability suppressions](/docs/apollo/managing-vulnerabilities/vulnerability-suppressions/)
  + [Add security information to promotion evaluation](/docs/apollo/managing-vulnerabilities/promotion-evaluation-security/)
  + [Remediating vulnerabilities](/docs/apollo/managing-vulnerabilities/remediating-vulnerabilities/)
* Managing Artifact Registries

  + [Overview](/docs/apollo/managing-artifact-registries/overview/)
  + [Create a new Artifact Registry](/docs/apollo/managing-artifact-registries/create-artifact-registry/)
  + [Assign an Artifact Registry to an Environment](/docs/apollo/managing-artifact-registries/assign-artifact-registry/)
  + [Mirrored Artifact Registries](/docs/apollo/managing-artifact-registries/mirrored-artifact-registries/)
* Managing Notifications

  + [Notifications](/docs/apollo/managing-notifications/overview/)
  + [User notifications](/docs/apollo/managing-notifications/user-notifications/)
  + [Team notifications](/docs/apollo/managing-notifications/team-notifications/)
* Walkthroughs
* [Publish to Apollo from CI](/docs/apollo/core/ci-publish-setup/)
* [Connect a Spoke Environment](/docs/apollo/core/connect-spoke/)
* [Set up a local Kubernetes cluster](/docs/apollo/core/set-up-local-kubernetes-cluster/)

[Documentation](/docs/apollo/core/introduction/)[Publish to Apollo from CI](/docs/apollo/core/ci-publish-setup/)

Publish Products to Apollo from your CI pipeline
================================================

Once you have access to your Apollo Hub, the next step is to start publishing your services as [Products](/docs/apollo/core/products-releases-versions/#products) that Apollo will then deploy.

Publishing a Product to Apollo is meant to be a straightforward command that you can add to your Continuous Integration (CI) solution.

This guide will walk through how to publish to Apollo from a CI pipeline so that new Product Releases are added to the [Product catalog](/docs/apollo/core/products-releases-versions/#product-catalog) each time new changes are committed to your service.

Prerequisites
-------------

### Access token

You will need either a Bearer Token or a client ID and client secret to run Apollo CLI commands in your CI pipeline.

If you are using a Bearer Token, you should add the token as a secret named `APOLLO_TOKEN` to your CI pipeline so that the value is available in the CI script.

[Learn more about configuring authentication for the Apollo CLI.](/docs/apollo/apollo-getting-started/apollo-cli-getting-started/#authentication)

### Make `apollo-cli` accessible in your CI pipeline

Because you will publish to Apollo using the `apollo-cli`, you will need to make sure the CLI is installed during the CI step to publish your Product. The CLI is a general-purpose tool used to list Product Releases, create artifacts, and publish Products to Apollo.

There are four ways that you can ensure the CLI is downloaded and accessible when you run your CI job:

* [Recommended] Download the CLI directly from your Hub during your CI job using the following command. If you are authenticating using a service user instead of a Bearer Token, there will be an additional step.

Additional step when using a service user
When authenticating with a service user, you must run the following command to obtain a Bearer Token. For the `client_id` and `client_secret` fields, enter your service user's credentials. This command will save the Bearer Token to a variable named `APOLLO_TOKEN` that you can then reference when running the subsequent command to download the Apollo CLI.

```
Copied!

1
2
3
4
5
6
7
8
9
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

```
Copied!

1
curl -o apollo-cli -H "authorization: Bearer $APOLLO_TOKEN" "https://<Hub>.palantircloud.com/assets/dyn/apollo-cli/bin/<os_distribution>/apollo-cli"
```

* Download the `apollo-cli` binary from your Hub and host it somewhere that is accessible to the CI virtual machine.
* Commit the CLI binary directly to your code repository.
* Build a Docker image that includes the CLI to use in your CI step.

Publishing with `apollo-cli`
----------------------------

Use the `apollo-cli product-release create` command to publish to Apollo from your CI pipeline. The following flags are required when publishing any product type:

* `--apollo-url`: The URL for your Apollo Hub instance.
* `--apollo-token`: The prerequisite Bearer Token you created in the previous step. Do not include this parameter if you are using a service account.
* `--apollo-client-id`: The client ID for a service account. Do not include this parameter if you are using a Bearer Token.
* `--apollo-client-secret`: The client service for a service account. Do not include this parameter if you are using a Bearer Token.
* `--maven-coordinate`: A unique identifier that refers to a specific version of a Product. Maven Coordinates are of the form `groupID:artifactID:version`.

When publishing a Helm chart, you are required to specify the artifact repository where your chart is hosted using the `--helm-repository-url` flag. This repository can be your Hub’s artifact store or a separate, external store, like an existing Artifactory or Harbor instance. You will also need to set `-—maven-coordinate`, the unique identifier for the Release you are publishing. See the [Product Releases documentation](/docs/apollo/core/products-releases-versions/#product-releases) for more information about the identifier format.

Below is an example `apollo-cli` command that publishes a new Release of a Helm chart using a Bearer Token that has already been pushed to your Hub’s artifact repository:

```
Copied!

1
2
3
./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-token $APOLLO_TOKEN --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version ${RELEASE_VERSION} --repository-url oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username $HUB_ARTIFACT_STORE_USER --password $HUB_ARTIFACT_STORE_PASS --output-dir "./chart"

./apollo-cli product-release create --manifest "./chart/manifest.yml"
```

Below is an example `apollo-cli` command that publishes a new Release of a Helm chart using a service account that has already been pushed to your Hub’s artifact repository:

```
Copied!

1
2
3
./apollo-cli product-release helm-chart init --apollo-url https://<Hub>.palantircloud.com --apollo-client-id $CLIENT_ID --apollo-client-secret $CLIENT_SECRET --maven-coordinate "com.palantir:apollo-demo-app:${RELEASE_VERSION}" --name oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --version ${RELEASE_VERSION} --repository-url=oci://containers-<Hub>.palantircloud.com/apollo-demo-chart --username $HUB_ARTIFACT_STORE_USER --password $HUB_ARTIFACT_STORE_PASS --output-dir "./chart"

./apollo-cli product-release create --manifest "./chart/manifest.yml"
```

Example publish step for an existing CI pipeline
------------------------------------------------

Here is a minimal example of a CI stage in GitLab that will publish a Helm chart that is hosted in your Hub’s artifact store. View the above command in this CI file. The full example below shows how you can push Helm charts to the Hub’s artifact store.

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
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

Full GitLab CI script for Product publishing
--------------------------------------------

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
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

[←

PREVIOUSWorkflows / Managing Notifications / Team notifications](/docs/apollo/managing-notifications/team-notifications/)

[NEXTConnect a Spoke Environment

→](/docs/apollo/core/connect-spoke/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Publish Products to Apollo from your CI pipeline](#publish-products-to-apollo-from-your-ci-pipeline)
  + [Prerequisites](#prerequisites)
  + [Publishing with apollo-cli](#publishing-with-apollo-cli)
  + [Example publish step for an existing CI pipeline](#example-publish-step-for-an-existing-ci-pipeline)
  + [Full GitLab CI script for Product publishing](#full-gitlab-ci-script-for-product-publishing)