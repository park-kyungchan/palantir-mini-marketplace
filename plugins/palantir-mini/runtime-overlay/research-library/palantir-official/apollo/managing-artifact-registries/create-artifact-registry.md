---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-artifact-registries/create-artifact-registry/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-artifact-registries/create-artifact-registry/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cc48f15ff303016d26877e8081d04a43c39986a4084b778ae8f2e8db2e303101"
product: "apollo"
docsArea: "managing-artifact-registries"
locale: "en"
upstreamTitle: "Documentation | Managing Artifact Registries > Create a new Artifact Registry"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a new Artifact Registry

To create an Artifact Registry, navigate to the **Artifact Registries** section of your Hub settings.

![Artifact Registry Hub Settings page, showing all existing Artifact Registries and a button to create new ones](/docs/resources/apollo/managing-artifact-registries/artifact-registry-show-hub-settings.png)

This is the location to manage all Artifact Registries for your Apollo Hub.

## Step 1: Enter the information for your OCI registry

Select **New registry** to create an Artifact Registry.

![The "Create Artifact Registry" step, prompting for the URL, display name, credentials, mirrored registries, and description](/docs/resources/apollo/managing-artifact-registries/artifact-registry-create-step-1.png)

In the **Registry URL** field, enter the URL of your OCI registry. This should be in the format of `registry.domain.com:port`, where `port` is the optional port that your registry is accessible on. If this is omitted, then a default of `:443` will be assumed.

**Display name** and **description** are optional fields that can be used to identify the Artifact Registry to other Apollo users. We recommend entering a descriptive name that will help users understand the purpose of the Artifact Registry.

See [Mirrored Artifact Registries](/docs/apollo/managing-artifact-registries/mirrored-artifact-registries/) for more information on how to use mirrored registries. Likely, you will not need to set this field, except under specific circumstances.

:::callout{theme="neutral"}
Registry URLs must be unique within Apollo. It is not possible to have two Artifact Registries with the same URL.
:::

Next, select the type of credentials that Apollo will use to access the OCI registry. There are two options:

* Direct OCI authentication with basic authentication or no authentication.
* Amazon Elastic Container Registry (ECR) authentication.

## OCI credentials

There are two options for OCI credentials:

* Basic authentication: You will enter a username and password combination.
* No authentication: Apollo will not use credentials when trying to access the registry.

Once created, you will be unable to view the entered credentials for the OCI registry again, so ensure they are correctly entered prior to creation.

:::callout{theme="warning"}
You should only select the **No authentication** method if you are deploying a product that has its images in a public OCI registry such as `docker.io` or `quay.io`.
:::

## Amazon Elastic Container Registry (ECR)

To use Amazon ECR, you will need to provide the following information from a provisioned AWS IAM user:

* Access Key ID
* Secret Access Key
* FIPS Mode: Uses the [AWS FIPS ↗](https://aws.amazon.com/compliance/fips/) endpoints for ECR.

## Step 2: Set roles

Next, you must assign some roles for your newly created Artifact Registry. You must set initial permissions within five minutes of creating the Artifact Registry. We recommend assigning the "Artifact Registry administrator" role to a team that you are a member of so you can make further changes. Any global role assignments from the [**Permissions** tab](/docs/apollo/core/authorization/) will be inherited and appear in this step.

Enter a team name into the **Add more teams...** text box to select a team, then configure which roles they are granted using the dropdown.

:::callout{theme="neutral"}
We recommend assigning the "Artifact Registry assigner" role to any team responsible for managing Environments, so they are able to add any created Artifact Registry to their Environment.
:::

## Step 3: Update the Artifact Registry

At this point, you can update certain parts of the Artifact Registry:

* Display Name
* Description
* Mirrored Registries
* Credentials (must be replaced, not edited)

Updates will create a new revision version. You can check the version against the version that is displayed in the Environment settings to ensure the changes have been actuated into the Environment and will be usable.
