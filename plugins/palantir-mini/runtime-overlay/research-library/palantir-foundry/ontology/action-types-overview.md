---
source: https://www.palantir.com/docs/foundry/action-types/overview/
fetched: 2026-04-20
section: ontology-deep
doc_title: Action types overview
---

# Action types

In the Ontology, users make changes to objects, properties, and links by applying actions. An action is a single transaction that changes the properties of one or more objects, based on user-defined logic.

An **action type** is the definition of a set of changes or edits to objects, property values, and links that a user can take at once. It also includes the side effect behaviors that occur with action submission.

## Example

An `Assign Employee` action type defines how users change the `role` property of an `Employee` object. It can:

* Require a parameter for the new role (standardized form input).
* Include a rule to automatically create a link between the `Employee` and a new `Manager` object.
* Include a notification side effect to notify old and new managers.
* Validate that only authorized employees (e.g., HR) can perform the action.

With this configured, an HR employee can take the action to switch "Melissa Chang" to a "Product Manager" role.

## Ontology integration

Any changes committed via actions are reflected in all user applications immediately. The same action logic and validations are available across all user-facing applications, ensuring consistent edits. The most up-to-date object data with user edits incorporated is captured in an object type's writeback dataset.
