---
source: https://www.palantir.com/docs/foundry/action-types/set-up-webhook/
fetched: 2026-04-20
section: ontology-deep
doc_title: Set up a webhook
---

# Set up a webhook

## Prerequisites

1. Complete the action type [getting started](action-types-getting-started.md) tutorial.
2. Set up a webhook connection in Data Connection (requires system administrator permissions for the external system).

## Steps

In the action type editor, go to **Logic** tab → **Add new rule** → **Webhook**.

### Configure timing

By default, the webhook runs as a **side effect** (after Foundry object edits). Select **Writeback** to run the webhook *before* object edits are applied.

### Select webhook

Choose the webhook to execute (e.g., **Modify ticket priority**) and optionally select a specific version.

### Map input parameters

Map webhook input fields to action type parameters. A new action parameter is auto-generated for each webhook input unless a parameter with the same name already exists. Example: map `priority` webhook input to an existing `Ticket Priority` action parameter.

### Complete and save

Select **Add webhook**. Remove any unused auto-generated parameters. Select **Save**.

## Result

When the action is submitted, the request to the external system fires before (writeback) or after (side effect) Foundry object changes are applied.
