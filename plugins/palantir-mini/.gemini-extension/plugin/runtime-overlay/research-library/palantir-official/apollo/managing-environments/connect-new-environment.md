---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/connect-new-environment/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/connect-new-environment/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "30828d6e281d93c3ad0f6948c05c10bb8c691f8f17073d7bd04b4d2340413051"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Create and connect a new Apollo Environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create and connect a new Apollo Environment

An Environment in Apollo is a Kubernetes cluster. This guide will walk through how to create an Environment in Apollo, and then connect your Kubernetes cluster to that Environment, so it can be managed by Apollo.

## Prerequisites

Before creating a new Environment in Apollo, you should confirm that your Kubernetes cluster meets the [Spoke Environment prerequisites](/docs/apollo/managing-environments/spoke-environment-prerequisites/). If you are testing or getting started with Apollo, you can [set up a local Kubernetes cluster](/docs/apollo/core/set-up-local-kubernetes-cluster/).

## Create a new Environment

To create an [Environment](/docs/apollo/core/environments/), navigate to the Environment home page by selecting **Environments** in the left menu panel. Select **New environment...** in the top right corner, then select **Create environment**. You must have the [Environment creator role](/docs/apollo/core/authorization/#roles-for-environments-and-entities) to create new Environments.

![The create new environment button is highlighted on the top right corner of the Environment home page.](/docs/resources/apollo/managing-environments/create-new-apollo-environment.png)

You will be redirected to a new page with a walkthrough to create and connect the Environment.

![Create new Environment](/docs/resources/apollo/managing-environments/create-environment-step-1.png)

Next, you will complete the Environment management settings form.

1. Start by entering a name for your Environment.
2. Select the connection settings for your Environment. The connection settings determine how Apollo handles [agent connectivity](/docs/apollo/core/agents/) for the Environment. See [Configure Environment connection settings](/docs/apollo/managing-environments/environment-connection-settings/) for more information about the different connection settings.
3. Select your accreditation scheme. If this is your first time creating an Environment, we recommend that you select the `Dev` accreditation, which means any [change request](/docs/apollo/managing-changes/change-requests/) made for your Environment will be auto-approved. Production Environments should use the `Standard` accreditation or higher based on your compliance requirements.
4. Select a Spoke Control Plane Module for your new Environment. Each Module defines the initial services that will run in the Environment. The options are:
   * **Apollo Control Plane**: A [Module](/docs/apollo/managing-modules/overview/) that consists of just the [Apollo Agents](/docs/apollo/core/spoke-control-plane/#apollo-agents) that run in the Spoke Control Plane. This option is useful for testing the deployment of your services in Apollo, including installation and upgrading, without all the Spoke Control Plane requirements.
   * **Blank environment**: No initial [Module](/docs/apollo/managing-modules/overview/) will be installed. This option can be useful if you are creating the Environment in Apollo before its backing infrastructure is fully available. For the Environment to be managed by Apollo, you will need to install an [Apollo Agent](/docs/apollo/core/spoke-control-plane/#apollo-agents).
5. In the **Advanced settings**, you can configure the team you want to be the contact team of the Environment. The contact team is the primary point of contact for the Environment. By default, no team will be assigned as a contact team for the Environment. If you do not add a contact team when creating an Environment, you can add one later.

Select **Next** when you are finished configuring the settings.

Next you will set the [roles for the Environment](/docs/apollo/core/authorization/#roles-for-environments-and-entities). These roles define the permissions other Teams will have in the Environment. You can [change these roles and permissions](/docs/apollo/core/authorization/#configure-rbac-for-a-single-environment) later. When you are finished, select **Set initial roles**.

![Set Roles](/docs/resources/apollo/managing-environments/create-environment-set-roles.png)

Next, you will determine which **Artifact Registries** to assign to the environment. If you are deploying Products that require access to your own OCI registry, you should assign it to the Environment. See [Artifact Registries](/docs/apollo/managing-artifact-registries/overview/) for more information. When you are finished, select **Add Artifact Registries**. This will create a change request that needs to be approved before it will be assigned to the Environment.

Finally, you can access your newly created Environment. Select **Go to your environment** to view the Environment.

![Environment Created](/docs/resources/apollo/managing-environments/create-environment-done.png)

You can now connect your Kubernetes cluster to your Environment.

## Connect Environment to Apollo

### Deploy Apollo Agent to cluster

Before connecting your Kubernetes cluster to the created Environment, you must install some basic Apollo services in your Environment. If you chose to install the "Apollo Control Plane" Module, Apollo will automatically install the necessary services in your Environment. If you chose the "Blank environment" Module, you should install an Apollo Agent yourself. We recommend installing either the "Apollo Control Plane" Module to have everything set up for you.

If you chose the `Dev` accreditation, the required services will be installed automatically, and you can continue to the next step. Otherwise, Apollo will create a change request to install the services in your Environment.

:::callout{theme="neutral"}
You will not be able to approve your own change request, so you will need someone else from your team to approve it.
:::

To approve the change request, navigate to the **Changes** tab in the Environment.

![Changes Tab](/docs/resources/apollo/managing-environments/environment-changes-tab.png)

Select the change request to approve it:

![Approve Change Request](/docs/resources/apollo/managing-environments/click-on-change-request.png)

Once the change request is approved, you can connect your Environment.

![Approve Change Request](/docs/resources/apollo/managing-environments/approve-change-request.png)

### Connect Environment to Kubernetes cluster

Navigate to the **Overview** tab of your Environment. Below the tabs, Apollo will display a banner stating that the Environment never connected. On the far right, select **Environment setup guide**. This can also be accessed in the **Actions** dropdown under **Environment setup steps**.

![Environment Setup banner](/docs/resources/apollo/managing-environments/environment-setup-banner.png)

Follow the steps in the **Environment setup instructions** to connect your new Apollo Environment to your Kubernetes cluster.

![Environment Setup Instructions](/docs/resources/apollo/managing-environments/environment-connect-agent-banner.png)

Download the initial Kubernetes manifest and apply it to your Kubernetes cluster to install [`helm-chart-operator`](/docs/apollo/core/spoke-control-plane/#helm-chart-operator). You can run the following command to ensure that [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/) services are now running in your cluster:

```bash
$ kubectl get pods --all-namespaces -o wide
```

A green check mark will appear next to each Apollo Agent once it is running, which means your Environment is now fully Apollo managed.

Once setup is completed, you can then [install your first Product](/docs/apollo/managing-entities/add-and-edit-entities/).

More information about Environment management settings can be found in [Editing Environment management settings](/docs/apollo/managing-environments/editing-environment-management-settings/).
