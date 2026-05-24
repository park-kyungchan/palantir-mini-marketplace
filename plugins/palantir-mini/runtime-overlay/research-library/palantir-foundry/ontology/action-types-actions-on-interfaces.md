---
source: https://www.palantir.com/docs/foundry/action-types/actions-on-interfaces/
fetched: 2026-04-20
section: ontology-deep
doc_title: Actions on interfaces
---

# Actions on interfaces

You can create generic actions that apply to all objects of a chosen interface. There are two main ways you can use interfaces from within actions:

* **Interface action rules:** To create, modify, delete, and link objects of the configured interface.
* **Interface reference parameters:** To reference objects of the configured interface. This parameter is required by the "Modify" and "Delete" interface action rules, but can also be used by any other action rules.

Interface action submission criteria apply uniformly to all object types that implement the interface. Before you create an interface action, carefully review which users will have permission to create, modify, or delete objects across all object types that implement the interface.

## Using action on interface rules

You can use interface action rules whenever the edits can apply to all the object types that implement the interface. In other words, you can use interface action rules only to modify the *interface shared properties* or to delete objects.

### Creating a new interface action type

To set up a new interface action type, choose **Action type** from the **New** menu in Ontology Manager.

1. Under **Interfaces**, pick the desired interface and rule type.
2. Add the shared properties that you want to include in the action (if applicable).
3. Add metadata to describe your action type.
4. Under **Submission criteria**, choose the users that can execute the action.
5. Select **Create** to finalize the action type.

### "Create" actions on interfaces

Because the action type is only associated with an interface, an "Object type" parameter will be automatically generated to indicate the object type that should be created. Note that **objects cannot be created without a primary key**.

### "Modify" actions on interfaces

"Modify" rules on an interface can modify any object of the configured interface. An "interface reference" parameter will be generated, constrained to the selected interface. Note that primary key values *cannot be modified* by any action type.

### "Delete" actions on interfaces

"Delete" action rules can have an "interface reference" parameter assigned to them, instead of an object reference parameter.

### "Create link" actions on interfaces

"Create interface link" rules allow you to create links using an interface link constraint defined on an interface. If there are multiple concrete link implementations on the object type for the link constraint, the action will fail.

### "Delete link" actions on interfaces

"Delete interface link" rules allow you to delete links using an interface link constraint defined on an interface. If there are multiple concrete link implementations on the object type for the link constraint, the action will attempt to delete all the concrete link implementations.

### Executing actions on interfaces

Actions created with interface action rules can be applied to objects whose object type implements the interface, just like any object-specific action type.

## Permissions

Interface action rules follow the same permissions as object action types. See the documentation on [action type permissions](/docs/foundry/action-types/permissions/) for more details.

## Level of support

### Supported applications and services

* **Ontology Manager:** Creation of interface action types and configuration of interface parameters in submission criteria and overrides.
* **Object Explorer and Object Views:** Rendering of actions defined on interfaces.

### Limitations of interface action rules

* Submission criteria apply uniformly across all object types that implement the interface.
* Action logs are not yet supported.
* Actions on interfaces cannot be used with functions.
