---
sourceUrl: "https://www.palantir.com/docs/foundry/data-connection/media-set-sync/"
canonicalUrl: "https://palantir.com/docs/foundry/data-connection/media-set-sync/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ee8f6928a485b361311242db72bd20aeb37a284ca4d602682b28cb10798c7dff"
product: "foundry"
docsArea: "data-connection"
locale: "en"
upstreamTitle: "Documentation | Syncs > Set up a media set sync"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Media set syncs

This page discusses how to set up a media set source and sync into Foundry via Data Connection.

The following source types support media syncs:

* [Amazon S3](/docs/foundry/available-connectors/amazon-s3/)
* [OneLake and Azure Blob Filesystem (ABFS)](/docs/foundry/available-connectors/onelake-and-azure-blob-filesystem/)

A growing list of sources support media syncs. However, if your desired file-based source is not yet supported, you can ingest your files within a dataset and convert them into media sets via [Python transforms](/docs/foundry/transforms-python/media-sets/).

## Set up a media set source and sync

1. Find a supported source by navigating to the **Source** page via **+ New Source**. Then, search for **Media Sync** to find all supported sources.

![Media Syncs.](/docs/resources/foundry/data-connection/media-syncs.png)

2. Ensure you have permissions to import any necessary network policies and then set up supported source using the appropriate instructions below:

* [Amazon S3](/docs/foundry/available-connectors/amazon-s3/)
* [OneLake and Azure Blob Filesystem (ABFS)](/docs/foundry/available-connectors/onelake-and-azure-blob-filesystem/)

3. In the **Overview** page of the source, find the **Media set syncs** section to create a media set sync.

![Media set sync section](/docs/resources/foundry/data-connection/media-set-sync-section.png)

4. Set up the media set sync by selecting the desired media file types. See [supported media set schemas](/docs/foundry/media-sets-advanced-formats/media-overview/#supported-media-set-schemas).

![Media set sync file type configuration](/docs/resources/foundry/data-connection/set-up-media-set-sync-file-type.png)

5. Create the desired build schedule for your media sync ingest. You can edit the schedule after the initial configuration.

![Media set sync schedule](/docs/resources/foundry/data-connection/set-up-media-set-sync-schedule.png)

6. Select the relevant subfolder within your source. If your media files are at the root path, there is no need to add a subfolder configuration.

![Media set sync subfolder Configuration](/docs/resources/foundry/data-connection/set-up-media-set-sync-subfolder.png)

7. Set up your sync filters. Available sync filters include **Exclude files already synced**, **Path matches**, **File size limit**, and **Ignore items not matching schema**.

![Media set sync filters](/docs/resources/foundry/data-connection/set-up-media-set-sync-filters.png)

8. Choose **Save media set sync** when you have selected your initial configuration.

9. Select **Run** to trigger your first sync and view your media sync.

![Run initial media set sync](/docs/resources/foundry/data-connection/set-up-media-set-sync-run-initial-sync.png)

Once you have set up your media set sync, learn how to leverage your media set with [transforms in Pipeline Builder](/docs/foundry/pipeline-builder/transforms-transform-media/).
