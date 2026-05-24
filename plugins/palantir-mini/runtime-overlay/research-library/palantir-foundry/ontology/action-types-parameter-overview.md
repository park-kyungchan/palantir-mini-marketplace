---
source: https://www.palantir.com/docs/foundry/action-types/parameter-overview/
fetched: 2026-04-20
section: ontology-deep
doc_title: Parameters overview
---

# Parameters

**Parameters** are the inputs of an action type. They are the interface between the **Rules** and other Foundry applications (Workshop, Slate, Object Views). Parameters are treated as variables that hold external values.

## Parameter type

Each parameter is defined by a type (e.g., string, object reference, integer) that dictates what kind of values it can accept. Beyond type, parameters have additional configuration options:

* Whether exposed in the form or hidden.
* Whether the user can change the value or it is read-only.

## Parameter uses

Parameters transport values across the action type and can be referenced in:

* **Rules** — to pass the value to an object property, link, or side effect.
* **Submission criteria** — to check if the action can be submitted.
* **Object property reads** — to access the current value of an object property before the action changes it.
* **Overrides** — to change the configuration of a subsequent parameter.

## Examples

**Basic:** A `Ticket` object parameter and a `Status` string parameter. When submitted, the object parameter carries the selected ticket, and the status parameter carries the new status. Rules execute the edit.

**Workshop variable:** A `previous_status` Workshop variable captures the current `Status` property of the selected `Ticket` and passes it to a hidden `Previous Status` parameter. The `Status` parameter carries the updated value. Both are passed to rules on submission.
