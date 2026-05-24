---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/retries/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/retries/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "65c477ed8b00edf677a4b5d7354b27e1497cbbe5dca411aa968f4826b2d3373c"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Settings > Manual and automatic retries"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manual and automatic retries

Automations can sometimes fail to execute. When this occurs, Automate will display an [error](/docs/foundry/automate/errors/) as shown in the screenshot below.

![An example effect failed error in Automate.](/docs/resources/foundry/automate/failed-events.png)

Errors can be transient (temporary) or due to an invalid configuration. Automate's retry functionality provides resilience for both of these error types.

## Manually retry failures

Automate errors can occur when effects are not configured correctly. For example, when an action is misconfigured such that there are [action effect errors](/docs/foundry/automate/errors/#action-effect-errors), automations using this action can fail. In order to remediate this, you can update the action configuration and rerun failed automations manually to ensure these events are correct.

These failures can be manually retried by selecting **Retry failed events**. This enables you to choose the specific events to retry, as shown below.

![select failed events](/docs/resources/foundry/automate/select-failed-events.png)

After choosing the events to retry, you can select the specific effects to retry. Note that these effects will be retried on the latest configuration. If there is only one effect available to retry, that effect will be automatically selected.

![select effects prompt](/docs/resources/foundry/automate/selected-effects.png)

After selecting **Retry events**, a retry job will be scheduled and will appear in the **Event log** as shown below. More details about the scheduled retry job can be viewed on the manual execution page.

![retry-job](/docs/resources/foundry/automate/retry-job.png)

### Manual execution failures

You can also retry [manual executions](/docs/foundry/automate/manual-execution/) which have failed effects. In order to retry failed batches, open up the sidebar for a manual execution run.

![manual execution failures](/docs/resources/foundry/automate/manual-exec-failures.png)

Selecting **Retry failed batches** will allow you to configure how you want the retried job to run, such as the batch size.

![manual execution dialog](/docs/resources/foundry/automate/manual-execution-retry-dialog.png)

Selecting **Retry** will immediately schedule a re-run of the failed effects.

![rerunning job](/docs/resources/foundry/automate/rerunning-failed-batch-job.png)

## Configure automatic retries

Automations can also fail for reasons that are transient. These failures can be manually retried, but you can also configure automatic retries for effects that are prone to transient errors.

Examples of transient errors include:

* Rate limit errors from AIP models
* External service errors when using webhooks

The retry configuration can be modified on the specific effect, as shown below.

![effect retry configuration](/docs/resources/foundry/automate/effect-retry-config.png)

Note that retries can currently only be configured on:

* Action effects
* Logic effects
