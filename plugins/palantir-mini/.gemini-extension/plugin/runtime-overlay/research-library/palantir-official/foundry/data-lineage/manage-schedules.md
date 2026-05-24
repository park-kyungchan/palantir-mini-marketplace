---
sourceUrl: "https://www.palantir.com/docs/foundry/data-lineage/manage-schedules/"
canonicalUrl: "https://palantir.com/docs/foundry/data-lineage/manage-schedules/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5caa1f19343b63aa860e14932cedfbe45a208389f4ba73fc368ca1f8ac50212b"
product: "foundry"
docsArea: "data-lineage"
locale: "en"
upstreamTitle: "Documentation | Understand and manage datasets > Manage schedules"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manage schedules

Data Lineage allows you to easily manage build schedules within your lineage graph. In the right sidebar, select **Manage schedules** to open the schedule details pane.

![Manage schedules in Data Lineage](/docs/resources/foundry/data-lineage/manage-schedules.png)

You will see the schedules related to selected datasets in your graph. Click on a schedule to see more details:

![Manage schedules details in Data Lineage sidebar](/docs/resources/foundry/data-lineage/manage-schedule-details.png)

* **Latest run:** The status of the latest run of the schedule.
* **Last update:** A timestamp of when the last update took place and the user who made changes
* **Target datasets:** A list of downstream datasets including in the build schedule.
* **When to build:** Displays the build schedule trigger determined when creating the build schedule. For example, a build schedule can be set to run **when specific datasets update.**
* **Build scope:** Defines the Project or user datasets included in the build and the permissions used to run the build.

Learn more about scheduling builds in the [**Building pipelines**](/docs/foundry/building-pipelines/scheduling-overview/) documentation.
