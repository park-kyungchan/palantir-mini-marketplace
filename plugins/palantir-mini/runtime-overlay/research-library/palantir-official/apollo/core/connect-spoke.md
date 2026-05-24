---
sourceUrl: "https://www.palantir.com/docs/apollo/core/connect-spoke/"
canonicalUrl: "https://palantir.com/docs/apollo/core/connect-spoke/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6b458394c2191e35915afcdb18c4fa72dd0ff6d805b5c2decc98ec333575c48b"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Apollo > Connect a Spoke Environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Connect a Spoke Environment

Once you have set up your Apollo Hub, the next step is to begin managing your Kubernetes clusters in Apollo as [Spoke Environments](/docs/apollo/core/overview/). These Environments run the [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/) and report status back to the Hub.

This guide will walk through how to connect a Spoke Environment in Apollo.

## Prepare your Kubernetes cluster

You should configure a Kubernetes cluster that satisfies the [Spoke Environment prerequisites](/docs/apollo/managing-environments/spoke-environment-prerequisites/). Refer to [Examples](#example-kubernetes-cluster-setup) for more information on the different tools you can use to set up your cluster.

## Configure your Apollo Environment

Log in to your Apollo Hub and check that you are a member of a [Team](/docs/apollo/managing-teams/overview/) on the Apollo home page.

![The Apollo home page lists the Teams that you are a member of.](/docs/resources/apollo/core/apollo-homepage-team.png)

Then select **Environments** from the left menu panel to navigate to the Environment list. Select **Connect environment...** from the top right corner.

Learn more about [connecting an Environment](/docs/apollo/managing-environments/connect-new-environment/) and [editing Environment management settings](/docs/apollo/managing-environments/editing-environment-management-settings/).

After completing the Connect environment workflow, your Kubernetes cluster is now connected to and managed by Apollo. You can now begin [installing software in your Environments](/docs/apollo/managing-entities/add-and-edit-entities/).

## Example Kubernetes cluster setup

There are many ways to provision a valid Kubernetes cluster to manage with Apollo. Your organization may already have worked out the right option for your own constraints, such as deploying through a cloud provider like [Azure Kubernetes Service (AKS) ↗](https://learn.microsoft.com/en-us/azure/aks/) or [Amazon Elastic Kubernetes Service (EKS) ↗](https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html).

For production, any CNCF-approved distribution will work, regardless of the cloud provider or infrastructure that is used to host the cluster.

### Local Docker and kind

To gain familiarity with Apollo, we recommend getting started with a local cluster using `kind` or `minikube`.

Learn more about [setting up a local cluster](/docs/apollo/core/set-up-local-kubernetes-cluster/).

### Amazon EKS

Refer to [EKS's guidelines for cluster sizing recommendations ↗](https://docs.aws.amazon.com/eks/latest/userguide/eks-outposts-capacity-considerations.html) to determine what cluster setup is best for the applications you want to run with Apollo.

You should also ensure that you can run `kubectl` and that it is configured to manage your EKS cluster.
