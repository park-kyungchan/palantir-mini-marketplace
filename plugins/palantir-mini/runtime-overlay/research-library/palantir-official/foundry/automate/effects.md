---
sourceUrl: "https://www.palantir.com/docs/foundry/automate/effects/"
canonicalUrl: "https://palantir.com/docs/foundry/automate/effects/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "10102d3b20236b16e3c8af30bc0f5afb27b75803cbe100e02c20176de01ba2cd"
product: "foundry"
docsArea: "automate"
locale: "en"
upstreamTitle: "Documentation | Effects > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Effects

Effects define what happens when an automation is triggered. When a condition is met, the automation executes one or more effects to perform actions, apply logic, execute functions, or send notifications.

## Effect types

Automate supports the following types of effects:

* **[Action effects:](/docs/foundry/automate/effect-actions/)** Execute actions on objects, such as creating, modifying, or deleting object instances.
* **[Logic effects:](/docs/foundry/automate/effect-logic/)** Execute AIP Logic functions.
* **[Function effects:](/docs/foundry/automate/effect-function/)** Execute a function when the automation condition is met.
* **[Notification effects:](/docs/foundry/automate/effect-notification/)** Send notifications to users or groups when the automation triggers.

## Fallback effects

Action, logic, and function effects can be configured with a [fallback effect](/docs/foundry/automate/effect-fallback/). Fallback effects execute when the primary effect fails, allowing you to handle errors gracefully by sending notifications, logging failures, or triggering alternative workflows.

## Effect settings

Configure how effects execute with [effect settings](/docs/foundry/automate/effect-settings/), including:

* **Concurrency:** Run effects sequentially or in parallel
* **Object edits:** Control how multiple edits are handled
* **Execution guarantees:** Understand at-least-once execution semantics
