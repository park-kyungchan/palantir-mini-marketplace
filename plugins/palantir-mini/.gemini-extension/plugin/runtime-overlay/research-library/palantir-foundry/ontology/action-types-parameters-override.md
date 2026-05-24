---
source: https://www.palantir.com/docs/foundry/action-types/parameters-override/
fetched: 2026-04-20
section: ontology-deep
doc_title: Override parameter configurations
---

# Overrides

Overrides change a parameter's behavior and configuration under specific conditions, avoiding the need to create separate action types for minor variations.

## Example

An action changes a support ticket status. Assignees can change status freely; managers must provide a justification. Using overrides, `Justification reason` is required and visible for managers, but hidden and optional for assignees.

## Adding and editing overrides

Add overrides from the **Value** tab in the **General** section (click **Add override** on any option). Or add manually from the **Overrides** tab, which shows all override blocks for the parameter.

## Override block structure

Each override block has:
* **"If" section** — one or more conditions (same as submission criteria conditions). Only parameters **above** the current parameter in the form hierarchy can be referenced.
* **"Then" section** — one or more overrides applied when conditions are met. Can change: constraints, visibility, requiredness, default values.

## Multiple override blocks

Multiple blocks can be added to one parameter. If more than one block is true, only the **first** block is executed.
