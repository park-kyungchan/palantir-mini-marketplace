---
source: https://www.palantir.com/docs/apollo/core/set-up-local-kubernetes-cluster
fetched: 2026-04-20
section: security-deployments
doc_title: set-up-local-kubernetes-cluster
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

[Documentation](/docs/apollo/core/introduction/)[Set up a local Kubernetes cluster](/docs/apollo/core/set-up-local-kubernetes-cluster/)

Set up a local Kubernetes cluster
=================================

This guide will walk through setting up a local Kubernetes cluster on your local machine.

These steps are only intended for development environments. For production environments, you should use a [CNCF-certified distribution of Kubernetes ↗](https://www.cncf.io/certification/software-conformance/#logos).

1. Install [Docker ↗](https://docs.docker.com/) on your local machine.

   * For macOS, you can run the following command:

   ```
   Copied!

   1
   brew install docker
   ```

   * Learn more about the different ways [to install Docker ↗](https://docs.docker.com/get-docker/).
2. Install [kind ↗](https://kind.sigs.k8s.io/) on your local machine. You should install kind in a safe folder on your machine, such as `My Documents`.

   * For macOS, you can run the following command:

   ```
   Copied!

   1
   brew install kind
   ```

   * Learn more about [installing kind ↗](https://kind.sigs.k8s.io/docs/user/quick-start#installation).
3. If you are using Docker desktop, run the following command to get started:

   ```
   Copied!

   1
   docker run -d -p 80:80 docker/getting-started
   ```
4. Create an empty directory on your desktop to store the files necessary for registering your cluster in Apollo. Note the location of this directory.
5. In the directory you created in the previous step, create a file titled `cluster.yml` and add the following configuration:

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
   kind: Cluster
   apiVersion: kind.x-k8s.io/v1alpha4
   # Apollo requires a multi-node cluster
   nodes:
   - role: control-plane
   - role: control-plane
   - role: control-plane
   - role: worker
   - role: worker
   - role: worker
   ```
6. In the directory you created above, run the following command to create a new Kubernetes cluster with the configuration from the previous step.

   ```
   Copied!

   1
   kind create cluster --config cluster.yml
   ```
7. Wait for the cluster to install and get started.
8. When it is finished, you can run `kubectl get nodes` to view all of the nodes that were created. This command should return the following output. Note that your `AGE` and `VERSION` information may differ from the example below.

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
   $ kubectl get nodes
   NAME                    STATUS      ROLES               AGE     VERSION
   kind-control-plane      Ready       control-plane       1h      v1.24.0
   kind-control-plane2     Ready       control-plane       1h      v1.24.0
   kind-control-plane3     Ready       control-plane       1h      v1.24.0
   kind-worker             Ready       <none>              1h      v1.24.0
   kind-worker2            Ready       <none>              1h      v1.24.0
   kind-worker3            Ready       <none>              1h      v1.24.0
   ```
9. You can now use this cluster to [set up a Spoke Environment in Apollo](/docs/apollo/core/connect-spoke/). Navigate to the **Create Environment** workflow in Apollo to continue setting up your Spoke Environment.

   ![The Register Environment workflow in Apollo.](/docs/resources/apollo/core/create-environment-step-1.png)

[←

PREVIOUSConnect a Spoke Environment](/docs/apollo/core/connect-spoke/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings