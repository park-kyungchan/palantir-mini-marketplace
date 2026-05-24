---
sourceUrl: "https://www.palantir.com/docs/foundry/manage-models/archive-model/"
canonicalUrl: "https://palantir.com/docs/foundry/manage-models/archive-model/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "052b8292e82314666ded519ec7315ffa57fd05e72d208634a962623f66c2754d"
product: "foundry"
docsArea: "manage-models"
locale: "en"
upstreamTitle: "Documentation | Modeling objective configuration > Archive models in an objective"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Archive models in an objective

As a modeling objective matures and accumulates many model submissions, it can be useful to *archive* old or rejected model submissions to make the objective easier to work with and understand.

Archiving a model submission has several effects:

* Removes the ability to create a [release](/docs/foundry/model-integration/objectives/#releases) from that model.
* Moves the model submission into the **Archive** table, accessible by clicking on the **View archive** link in the top right section of the **Models** view.

![Campaign model](/docs/resources/foundry/manage-models/archive_view-archive.png)

Foundry provides model archiving instead of hard deletion because objectives can act as an important system of record for models that have been previously deployed and used for operational decision-making.

To archive a model submission, navigate to the model submission's individual page, click on the **Actions** button in the top right corner, and select **Archive**.

![Archive model submission](/docs/resources/foundry/manage-models/archive_howto-archive.png)

Models that have been marked as a release are unable to be archived.

![Releases cannot be archived](/docs/resources/foundry/manage-models/archive_no-archive.png)

:::callout{theme="neutral" title="Clean up"}
After archiving a model submission, don't forget to adjust or remove the build schedule of any configured metric management pipelines.
:::
