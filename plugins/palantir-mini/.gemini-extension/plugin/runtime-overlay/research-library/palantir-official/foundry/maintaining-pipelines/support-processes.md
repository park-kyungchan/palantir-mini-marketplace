---
sourceUrl: "https://www.palantir.com/docs/foundry/maintaining-pipelines/support-processes/"
canonicalUrl: "https://palantir.com/docs/foundry/maintaining-pipelines/support-processes/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e8b0b38e1fe792c5f4c157c774bcd1e28cc70a0280866ea65be78c7ce5559847"
product: "foundry"
docsArea: "maintaining-pipelines"
locale: "en"
upstreamTitle: "Documentation | Maintaining pipelines > Recommended support processes"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Recommended support processes

The process of monitoring a pipeline is usually best managed by implementing on-call rotations. This means that one team member is actively monitoring the pipeline at a time ("on-call"), and responding to pipeline issues (usually in the form of failing health checks or monitoring rules) is their most important priority for the duration of the on-call rotation.

The following steps are recommended for setting up an effective pipeline monitoring team:

* Define support hours for the different pipelines you monitor.
  * Is it critical that the pipeline updates correctly overnight? Or on weekends?
* Define an alerting mechanism. More on this [below](#alerting-mechanisms).
* Define a support rotation schedule.
  * How long is a support rotation and on what day should hand-off occur?
  * (If you're using an external tool such as Pagerduty) Do you need a secondary on-call rotation schedule in case the primary person on-call misses an alert?
* Prepare pipeline documentation.
  * It should be easy to find where documentation lives. An example of a good location is to keep the documentation close to the pipeline in Foundry, such as in a top-level `documentation` folder of the Project where the key outputs of the pipeline live.
  * Documentation should include:
    * An overview of the purpose of your pipeline, how the outputs are used, and the organizational expectations and SLAs.
    * An up-to-date [Data Lineage](/docs/foundry/data-lineage/overview/) graph for your pipeline.
    * Note all upstream support teams that the on-call team member may need to contact if there is an issue. Examples to include: platform support teams, Palantir pipeline support teams, other teams at your organization that are providing data for your pipeline.
    * Make a note of an escalation path (how does the on-call person escalate if there is an urgent issue that needs immediate attention that they cannot resolve themselves?)
    * A section on recurring issues in your pipeline so that yourself or the next on-call person can easily identify an issue that has occurred before and apply the same fix. Some teams may choose to log all technical issues that occur, but consider that over-documenting can make it more difficult to find information quickly.
* Define an SOP for hand-off between on-call rotations
  * Will handover be scheduled at a regular time?
  * How will you track long-running issues that span across different team members' on-call rotations?
  * Whose responsibility will it be to track and resolve long-running issues? Does the on-call team member who first triaged the issue work on the issue when she is not on-call, or does the issue get handed off to whoever is actively on-call?
* Define a process to communicate downtime and maintenance to downstream consumers. This helps minimize the risk of downstream pipeline maintainers being alerted for non-issues.

## Alerting Mechanisms

An alerting mechanism allows you to respond reactively to health checks failing in your pipeline. This alleviates the need to periodically check a Data Lineage graph, dashboard, or report to see what the status of your pipeline is. Choosing the appropriate alerting mechanism depends on the scale of alerts and how tight your SLAs are (as this dictates how critical response time is).

The available options for automated alerting include:

* **Subscribing to all individual health checks** in your pipeline. This way you will receive Foundry and email notifications if you have this notification setting turned on. However, this method may be difficult to maintain manually.
* **Subscribing to a [monitoring view](/docs/foundry/monitoring-views/overview/)** to monitor a group of health checks and monitoring rules.
  * Notification frequency can be customized in the monitoring view's subscription settings.
* **Integrating monitoring views with an external alerting tool**.
  * Some tools help by also managing on-call rotations and schedules, including secondary on-call rotations.
  * Some tools can provide further flexibility and customization with alerting settings. Customizing how a notification escalates if it is not responded to can be especially useful if you have a very critical pipeline with strict time-based SLAs.
  * [Learn more about available integrations with external tools](/docs/foundry/monitoring-views/external-systems/).

Regardless of which option you implement, it is useful to implement filters so that you don't miss the alerts among other Foundry platform notifications.
