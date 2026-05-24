---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-welcome/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-welcome/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "eff0c83ff3bdc771be489bc10a9a28f513a3e542fcca6aa7c6209adcc8d77e6f"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Welcome"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Welcome to Apollo

Welcome to Apollo, Palantir’s continuous delivery and day 2 operations platform. This introduction guide supplements the guidance in the Apollo UI and the [Apollo platform documentation](/docs/apollo/core/introduction/).

The purpose of this guide is to give you hands-on experience with core workflows in the platform in a controlled setting. There are many ways to configure Apollo depending on the complexity of your environments, including on disconnected or air-gapped networks. In this guide, you will use a SaaS configuration with an Apollo Hub and connect your own Kubernetes clusters serving as your [Spoke Environments](/docs/apollo/core/spoke-control-plane/). You are also able to use your own Helm charts when prompted throughout this introduction guide. The diagram below illustrates the introduction guide architecture.

![High-level architecture of Apollo introduction guide.](/docs/resources/apollo/apollo-getting-started/intro_arch.png)

## Objectives

At the end of this guide, you should feel comfortable performing essential software deployment tasks using Apollo within a basic SaaS architecture. More specifically, you should be able to:

* Connect a Spoke Environment to an Apollo Hub.
* Install software from the Apollo Product catalog into your Spoke Environment.
* Recall a “bad” software release and define a roll-off strategy.
* Create and install new Products and Product Releases.
* Configure Product Release promotion pipelines and promotion criteria.
* Set Product and Environment maintenance windows.

## Prerequisites

Before getting started, make sure you have satisfied these prerequisites:

1. You have at least one Kubernetes cluster that meets [the Spoke Environment requirements](/docs/apollo/managing-environments/spoke-environment-prerequisites/). If you do not have a Kubernetes cluster, you can [set one up locally using Docker and kind](/docs/apollo/core/set-up-local-kubernetes-cluster/).
2. You can SSH and SCP to your Kubernetes cluster(s) and execute `kubectl` commands.
3. You have admin rights on your local machine.
4. You can reach the public Internet from your local machine.
5. You have an authorization application, like Microsoft Authenticator, on your mobile device for multi-factor authentication.
6. You can log into your Apollo Hub.

You should create a local directory on your computer titled `apollo_introduction`. This will be a reliable location for storing any resources you generate in the course of your work.

We recommend taking a few moments to review the Apollo fundamentals:

* [Apollo overview video (YouTube) ↗](https://www.youtube.com/watch?v=XmLVuZKd2L0) (4:30)
* [Palantir Apollo Orchestration: Constraint-Based Continuous Deployment For Modern Architectures ↗](https://blog.palantir.com/palantir-apollo-orchestration-constraint-based-continuous-deployment-for-modern-architectures-cdf42da19ba4) (8 min read)
* [Apollo documentation: Introduction](/docs/apollo/core/introduction/) (5 min read)

**Next → [Connect a Spoke Environment](/docs/apollo/apollo-getting-started/introduction-environments/)**
