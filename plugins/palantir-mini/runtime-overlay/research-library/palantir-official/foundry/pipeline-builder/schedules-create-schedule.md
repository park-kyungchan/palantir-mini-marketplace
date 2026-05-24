---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/schedules-create-schedule/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/schedules-create-schedule/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "31c6c559c2e1e6d2a4102bf5f71548c5926ae280ac0d89d40b01e56ba5aa8f15"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Schedules > Create a schedule"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a schedule

To create a build schedule for your pipeline datasets in Pipeline Builder, first select the dataset node in your pipeline workflow. Right-click the node and select **Open** to open the full dataset preview window.

![Screenshot of creating a schedule selection dropdown](/docs/resources/foundry/pipeline-builder/schedules-create-schedule@2x.png)

In the dataset preview pane, click the **Schedules** tab and select **Add build schedule**.

![Screenshot of creating a schedule selection dropdown](/docs/resources/foundry/pipeline-builder/schedules-create2@2x.png)

In the **New schedule** pane, choose whether to build the dataset when a parent resource updates or at a specific time.

* **When a parent resource updates:** The build will occur whenever a selected parent dataset updates. Search for a dataset, or choose from the available parent datasets in the dropdown.

![Screenshot of creating a schedule when a parent resource updates](/docs/resources/foundry/pipeline-builder/schedules-new-schedule@2x.png)

* **At a specific time:** Schedule a build to occur at a defined cadence. Choose a time value, occurrence, and time details. For example, you can schedule a build `By hour`, `Every 5 hours`, `At 15 minutes past the hour`, or `By month`, `Every 6 months`, `On Second Monday`, `At 1:30 AM`, in the `America/Los_Angeles` timezone.

![Screenshot of choosing a specific time for the schedule](/docs/resources/foundry/pipeline-builder/schedules-specific-time@2x.png)

To add additional scheduling details, including build scope parameters, build failure actions, and notifications, click **Advanced**. This will take you to the Data Lineage app, where you can configure advanced build schedule features for the selected dataset.

Learn more about [scheduling in Data Lineage](/docs/foundry/building-pipelines/create-schedule/).
