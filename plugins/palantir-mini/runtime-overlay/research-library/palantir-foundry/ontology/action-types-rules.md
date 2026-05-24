---
source: https://www.palantir.com/docs/foundry/action-types/rules/
fetched: 2026-04-20
section: ontology-deep
doc_title: Action type rules
---

# Action type rules

Rules define what an action type does when submitted. Each action type can have multiple rules.

## Rule types (12 total)

### Ontology rules
1. **Create object** — creates a new object of a specified type.
2. **Modify object** — edits one or more properties on an existing object.
3. **Delete object** — deletes an existing object.
4. **Add link** — adds a link between two objects.
5. **Remove link** — removes an existing link between two objects.
6. **Create object and link** — creates a new object and immediately links it to an existing object.
7. **Modify interface property** — edits a property on an interface shared by multiple object types.
8. **Add interface link** — adds a link defined on an interface.
9. **Remove interface link** — removes a link defined on an interface.
10. **Delete interface object** — deletes an object via an interface reference.
11. **Add interface to object** — attaches an interface to an existing object.
12. **Function rule** — executes a `@OntologyEditFunction()` for complex multi-object logic.

## Value sources

Rule property assignments can draw values from:
- **From parameter** — value the user provides in the action form.
- **Object parameter property** — current property value on a referenced object parameter.
- **Static value** — a fixed value set at design time.
- **Current user** — the Foundry user ID of the person submitting the action.
- **Current time** — the timestamp at the moment of submission.

## Invalid combinations

- Cannot delete an object before adding it in the same action.
- Cannot modify an object before creating it in the same action.
- Cannot create the same object twice in the same action.
- A **Function rule** cannot be combined with other Ontology rules in the same action type.

## Side effect rules

- **Notification rules** — sent after Ontology edits are applied; notification content uses the pre-edit state of referenced objects.
- **Webhook rules** — can be configured to run before or after Ontology edits.
