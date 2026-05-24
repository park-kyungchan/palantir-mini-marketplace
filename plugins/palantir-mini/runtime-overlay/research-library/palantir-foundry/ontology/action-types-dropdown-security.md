---
source: https://www.palantir.com/docs/foundry/action-types/dropdown-security/
fetched: 2026-04-20
section: ontology-deep
doc_title: Object dropdown security considerations
---

# Object dropdown security considerations

Static value filters in object dropdown validations are exposed to all users who can view the action type. Use of these filters risks exposing property value combinations to users without permissions to view the filtered objects. This risk is mitigated by relying on object properties or parameters to filter the object set. The values are not directly visible in the interface.

## Example: Data privacy issue

As an example, imagine we have a `Document` object with an `Investigation Name` property. In our action type, we add a filter on the object reference parameter to only show **Documents** where **Investigation Name** is `Area 51 Investigation`.

Here, we would potentially be revealing that `Area 51 Investigation` is a property value of some `Document` objects to users who cannot view those documents.

This only applies to **static value filters**. There is no reference to the `Area 51 Investigation` when filtering the `Investigation Name` property by a parameter or by the property of another object because:

* The `Investigation Name` parameter is user-provided. No information about the underlying data is exposed to the action type viewer.
* The `Investigation Object` parameter will respect existing restrictions on object visibility for this user.

## Technical details

In most cases, the actions backend redacts sensitive information in the action type definition to avoid exposing sensitive property values. However, when viewing the action form, the object dropdown validation is converted into an object set. This means that users could review the network request containing this object set.

This means that these values will **not be visible in the interface** for any users. If visibility is a greater concern than security, this warning can be ignored.
