---
sourceUrl: "https://www.palantir.com/docs/foundry/data-lifetime/creating-a-deletion-policy/"
canonicalUrl: "https://palantir.com/docs/foundry/data-lifetime/creating-a-deletion-policy/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d779aa108a846539adc4633edf1a365243eb5b3fd92a36881f4801083f163168"
product: "foundry"
docsArea: "data-lifetime"
locale: "en"
upstreamTitle: "Documentation | Workflows > Create a deletion policy"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a deletion policy for a dataset

:::callout{theme="neutral"}
We recommend using the Data Lifetime application to set deletion policies. However, in some cases, it may be more appropriate to configure policies directly on a dataset. When [viewing a dataset](/docs/foundry/dataset-preview/overview/), select the **Details** tab, then **Lineage-aware retention policies** to create a new policy.
:::

Familiarize yourself with the various [permission roles](/docs/foundry/data-lifetime/core-concepts-data-lifetime/#permissions-and-roles) before attempting to create a new deletion policy. You must have the `Data Governance Officer` role or `Dataset Editor` privileges to perform the steps in this guide.

Follow the steps below to create a lineage-aware deletion policy.

1. Navigate to **Applications** from the left navigation panel, choose **Security & governance**, then select **Data Lifetime**.

2. Select **+ New Policy** and add the necessary information, including the policy name, type, and deletion date.

![The + New Policy button in the Data Lifetime application.](/docs/resources/foundry/data-lifetime/newpolicy.png)

3. Choose **Create policy** to land on the configuration details page of the new policy. Learn more about [deletion policy types](/docs/foundry/data-lifetime/deletion-policies-implications/).

![Create policy](/docs/resources/foundry/data-lifetime/createanewpolicy.png)

4. Select **Apply to dataset** in the upper left of the screen.

![Apply a policy to a dataset.](/docs/resources/foundry/data-lifetime/applytodataset.png)

5. Choose the dataset to which you want to apply the new policy.

![Choose a dataset to which you will apply a policy.](/docs/resources/foundry/data-lifetime/choosedataset.png)

6. Once you locate the appropriate dataset, choose *Select* to apply the policy. You should see a green success message appear at the top of your screen, confirming that the policy was successfully applied to the chosen dataset. Learn how to [further verify it a policy was properly applied](/docs/foundry/data-lifetime/view-changes-applied-policy/).
