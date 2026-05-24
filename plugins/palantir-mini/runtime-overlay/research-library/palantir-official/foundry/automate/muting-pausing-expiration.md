---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/muting-pausing-expiration/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/muting-pausing-expiration/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e24bd82a3e430d2c16d72ffbac96a35d631384e946f94dd7292a6f4a9c83a0b4"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Settings > Muting, pausing, and expiration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Muting, pausing, and expiration

Automations can be [muted](#muting-an-automation), [paused](#pausing-an-automation), or [configured to expire](#automation-expiration).

## Muting an automation

Automations can be muted by users or automatically by the system. When an automation is muted, the condition continues to be evaluated and [activity](/docs/foundry/automate/history/) is still recorded. However, no effects will be triggered. The automation can be unmuted at any time by a user with an `Editor` role on the automation.

### Auto-mute

When the **Auto-mute this automation** setting is enabled, the automation will automatically mute when all effects fail for at least 80% of the past 30 events.

![Auto-mute setting in the automation configuration.](/docs/resources/foundry/automate/auto-mute.png)

## Pausing an automation

Automations can be paused by users. While an automation is paused, the condition will not be evaluated and no further executions will be triggered. Additionally, Automate interrupts any currently active executions when an automation is paused by a user. The automation can be resumed at any time by a user with an `Editor` role on the automation.

![Expiration date configuration](/docs/resources/foundry/automate/muting-pausing-configuration.png)

## Automation expiration

Automations can be configured to have an expiration date or to run indefinitely. The longest permitted expiration date is six months from the present time. The expiration date can be updated at any time by a user with an `Editor` role on the automation.

The expiration date can be viewed and modified in the **Summary** tab of the automation edit wizard. Click on an automation to view the automation overview panel and then select **Edit automation**. Then, open the **Summary** tab to access the expiration date configuration.

![Expiration date configuration](/docs/resources/foundry/automate/summary-expiration-date-config.png)
