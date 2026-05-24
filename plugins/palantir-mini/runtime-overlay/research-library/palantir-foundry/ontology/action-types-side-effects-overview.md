---
source: https://www.palantir.com/docs/foundry/action-types/side-effects-overview/
fetched: 2026-04-20
section: ontology-deep
doc_title: Side effects overview
---

# Side effects

Side effects enable action types to send data out of Foundry to integrate with existing organizational processes.

## Use cases

- **Real-time notification** — alert users when a decision is made in the system so they can respond.
- **Decision orchestration** — when an external system is the source of truth, side effects integrate with that system on each action submission.

## Two types of side effects

### Notifications

Configure flexible user notifications when an action is applied. Supports in-platform Foundry notifications and email. See [notifications](action-types-notifications.md) and [set up a notification](action-types-set-up-notification.md).

### Webhooks

Connect to external systems (REST APIs, ERP systems, messaging platforms). Enables writing to external source systems or routing notifications through messaging integrations. See [webhooks](action-types-webhooks.md) and [set up a webhook](action-types-set-up-webhook.md).
