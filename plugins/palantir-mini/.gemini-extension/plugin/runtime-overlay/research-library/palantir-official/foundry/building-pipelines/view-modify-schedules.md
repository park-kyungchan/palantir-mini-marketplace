---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/view-modify-schedules/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/view-modify-schedules/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "53129474a2d473a2cc8736d002873929f20c75250f7b9061e0d87f7ba58d3287"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Scheduling > View and modify schedules"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# View and modify schedules

## View metrics

To view metrics and run history of an existing schedule:

1. Navigate to the dataset view, open the **Actions** menu, and select **Manage Schedules**.
2. This will bring you to the Data Lineage graph for that dataset, with the schedule panel open on the right.

   To view metrics and build history for a schedule, select the **Metrics** button. <br><br>
   ![schedules-page-metrics] <br><br>

## View schedule edit history

A new version of a schedule is created whenever the schedule is edited. The schedule versions page allows you to:

* See previous versions of the schedule.
* Compare two schedule versions to see what has changed.

To view the previous versions of a schedule:

1. Navigate to the schedule's metrics page.
2. Select the versions tab: <br><br>
   ![schedules-versions](/docs/resources/foundry/building-pipelines/schedule-versions.png) <br><br>

Only the versions up until the date displayed will be shown. If you need to see older versions, edit the date picker in the top right corner of the page.

## Edit a schedule

To edit an existing schedule:

1. Navigate to the dataset view, open the **Actions** menu, and select **Manage Schedules**.

2. This will bring you to the Data Lineage graph for that dataset, with the schedule panel open on the right.

3. To edit a schedule, click on the entry for that schedule. <br><br>
   ![schedules-page-edit] <br><br>

4. To edit the schedule, select the edit button. [Learn how to edit a schedule using the schedule editor.](/docs/foundry/building-pipelines/create-schedule/#define-the-schedule)

5. When you have finished editing your schedule, click the **Save** button.

## Pause a schedule

To pause a schedule:

1. Navigate to the dataset in Data Lineage, and open the schedule sidebar, selecting the schedule from the sidebar.
2. This will bring you to the schedules page for the dataset.
3. To pause a schedule, select the pause icon in the top right. <br><br>
   ![schedules-page-pause] <br><br>

## Resume a schedule

To resume a schedule:

1. Navigate to the dataset in Data Lineage, and open the schedule sidebar, selecting the schedule from the sidebar.
2. This will bring you to the schedules page for the dataset.
3. To resume a schedule, select **Resume** in the top right. <br><br>
   ![schedules-page-resume] <br><br>

## Automatically paused schedules

Foundry automatically pauses schedules that fail all jobs consecutively and over multiple times. Once the schedule is run successfully, the schedule will automatically unpause and the failure counter will be reset. If your schedule was paused and you would like to resume it, follow these steps:

1. Navigate to the schedule by clicking the link in the email sent to you.
2. Debug the schedule. Refer to the [troubleshooting guide](/docs/foundry/optimizing-pipelines/troubleshoot-schedules/) for reference.
3. Run the schedule after the fix is applied. After a job initiated by the schedule is completed successfully, the schedule will be automatically unpaused.

If you have a specific schedule that you want to exempt from being paused, contact your Palantir representative and provide the schedule RID.

## Delete a schedule

To delete a schedule:

1. Navigate to the schedule in Data Lineage, and choose the **Edit** button on the schedule.
2. To delete a schedule, select the trash icon in the top right. <br><br>
   ![schedules-page-delete] <br><br>

[actions-menu-manage-schedules]: ./media/actions-menu-manage-schedules.png

[schedules-page-metrics]: ./media/schedules-page-metrics.png

[schedules-page-edit]: ./media/schedules-page-edit.png

[schedules-page-pause]: ./media/schedules-page-delete-pause-buttons.png

[schedules-page-resume]: ./media/schedules-page-resume.png

[schedules-page-delete]: ./media/schedules-page-delete-pause-buttons.png
