---
source: https://www.palantir.com/docs/foundry/action-types/permissions/
fetched: 2026-04-20
section: ontology-deep
doc_title: Action type permissions
---

# Action type permissions

## Viewing action types

Users must have permission to view all object types referenced in an action type's parameters to see the action type in the UI.

## Applying action types

To apply (submit) an action type, a user must:
1. Have permission to view all referenced object types.
2. Pass all submission criteria conditions defined on the action type.

## Object edit settings

Foundry object types have an **object edit setting** controlling whether objects can be edited directly or only via action types. The recommended setting for new object types is **"Only allow edits via actions"**, which ensures all changes go through defined rules and audit trails.

## Side effect permissions

### Webhooks

Webhooks are not enabled by default on action types. An administrator must explicitly allow webhook execution for an action type.

### Notifications

Notification rules require that recipients have access to all data referenced in the notification content. If a recipient cannot view a referenced object or property, the notification may be redacted or not delivered.
