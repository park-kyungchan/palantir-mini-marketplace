---
source: https://www.palantir.com/docs/foundry/action-types/use-actions/
fetched: 2026-04-20
section: ontology-deep
doc_title: Use actions in the platform
---

# Use actions in the platform

Action types integrate across Foundry applications: Object Views, Object Explorer, and Workshop.

## Object Views (Actions section)

Add actions as buttons in the **Actions section** of an Object View. Configuration options:
- Custom label and color per button.
- Change on-click behavior: open the form OR apply immediately using default values.
- Show/hide button when a non-visible parameter is invalid.
- Provide a default value per parameter: object property, local value (current user, current timestamp, current object), or manually entered.
- Override visibility of individual parameters.

Use case: offer multiple structured variants of the same generic action (e.g., "Delay 10 minutes", "Delay 30 minutes").

## Object Explorer

Actions appear automatically in three locations:
1. **Actions dropdown** in Exploration View (top right) — populated with bulk actions for the current object set.
2. **Object Actions dropdown** in Object View (top right) — populated with applicable single and bulk action types for the current object.
3. **Linked objects view section** in Object View — populated with applicable single/bulk action types for selected objects.

In bulk (list view) contexts, only actions accepting object list parameters of the correct type are shown.

## Workshop

In Workshop, configure actions using the **Button group widget**. Extensions over the Object View Actions section:
- Three possible layouts.
- Additional display options: left/right icons, minimal styles, tag styles.
- A button can trigger a Workshop event, URL, or object set export in addition to an action.
- Default values can be Workshop variables, current user, or current timestamp.
