---
source: https://www.palantir.com/docs/foundry/action-types/inline-edits/
fetched: 2026-04-20
section: ontology-deep
doc_title: Inline edits
---

# Inline edits

Inline edits allow users to edit object properties directly in a table or grid without opening a dedicated action form. Two surfaces support inline edits:

1. **Object Explorer** — configure in the property's **Interaction** tab
2. **Workshop** — configure in the Object Table widget settings

## Requirements for an action type to support inline edits

* The action must target a **single object type** (not multiple)
* The action must target a **single object instance** per submission
* **Default values must be enabled** on all parameters
* The action must have **no side effect webhooks or notifications**

## Bulk submission behavior

When users select multiple rows and perform an inline edit, the action is submitted once per row. All submissions are batched and applied atomically if the action type supports batched execution; otherwise they are applied sequentially.

## Invalid inline action example

If an action type targets flight delays and requires a manual "delay reason" input with no default value, it cannot be used for inline edits — the user cannot provide per-row values in an inline table context. To enable inline edits, a default value must be defined for all parameters.
