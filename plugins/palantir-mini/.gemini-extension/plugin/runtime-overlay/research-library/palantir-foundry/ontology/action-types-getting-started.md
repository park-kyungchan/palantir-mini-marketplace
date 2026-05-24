---
source: https://www.palantir.com/docs/foundry/action-types/getting-started/
fetched: 2026-04-20
section: ontology-deep
doc_title: Getting started (action types)
---

# Getting started (action types)

This tutorial walks through creating an action type using the Demo Ticket object type as an example.

## Creating an action type

Navigate to the Action Types section of the Ontology Manager and click **New action type**. The creation wizard prompts you for:

1. **Action name** — user-facing label (e.g., "Update ticket status")
2. **Object type** — the primary object type the action will modify

## Configuring parameters

Parameters define the inputs a user provides when submitting an action.

* Add a parameter for each field you want the user to supply.
* Configure **constraints** on parameters to restrict valid values (e.g., multiple-choice dropdown for a status field).
* Set **default values** to pre-populate the form.

## Submission criteria

Submission criteria define when the action can be submitted. You can configure:

* **Required parameters** — action cannot be submitted if these are empty
* **Validation rules** — conditions that must be true before submission is allowed

## Conflict resolution

When two users submit edits to the same object simultaneously, a conflict may occur. Action types support configurable conflict resolution strategies:

* **Last write wins** — the most recent edit is applied
* **Fail on conflict** — the second submission returns an error, prompting the user to retry

## Adding the action to an Object View

After creating the action type, you can surface it to users by adding it to an Object View. In the Object View editor, navigate to the **Actions** tab and select the action type to display.
