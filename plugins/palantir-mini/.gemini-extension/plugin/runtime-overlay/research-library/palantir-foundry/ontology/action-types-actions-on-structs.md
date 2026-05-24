---
source: https://www.palantir.com/docs/foundry/action-types/actions-on-structs/
fetched: 2026-04-20
section: ontology-deep
doc_title: Actions on structs
---

# Actions on structs

[Struct property](/docs/foundry/object-link-types/structs-overview/) values can be created and modified with actions, through values supplied in a struct parameter.

## Struct parameters

A struct parameter is a parameter of base type `STRUCT`, where the type contains nested parameter fields that have their own individual names and base types. A struct parameter can be only be used to supply values for a struct property. The supported base types for struct parameter fields are `BOOLEAN`, `DATE`, `DOUBLE`, `GEOPOINT`, `INTEGER`, `LONG`, `STRING`, and `TIMESTAMP`.

## Defining actions on struct properties

Using actions with struct parameters, you can create and modify object types with struct properties. The values for the struct property are submitted in a struct parameter mapped to the property; each individual field of the struct property is mapped to a specific field of a struct parameter.

A mapping between a struct property and a struct parameter must be complete, with each field of the struct property mapped to a field in the struct parameter. The base type of the struct parameter field *must* match the base type of a mapped struct property field. If any breaking changes are to be made to the struct property type (for example, if a new field is added, a field is deleted, or a field's base type is changed), then the related action types must also be modified to incorporate those changes.

### Struct parameters in an action form

A struct parameter can be populated through action forms similarly to any other parameter type. However, struct parameter fields are rendered as a group in the form instead of individually.

## Default values for struct parameter fields

Default values are defined individually for struct parameter fields. Each struct parameter field is mapped to fields of a specified object type's struct property. A default value must be defined for all fields in the struct parameter and must be mapped to fields of the same object type struct property. Only struct property fields can act as default values for struct parameter fields.

## Constraints on struct parameter fields

Constraints can be configured individually for struct parameter fields, as with regular parameters. A struct parameter value is *only* valid if *all* fields meet the defined constraint.

## Limitations

* Struct property values can only be created or modified through *struct parameters*. Other forms of entry, such as static values or references to object properties, are not supported.
* A struct property can only be created or modified through a *single* struct parameter.
* A struct parameter can only be used to create or modify *struct* properties. Struct parameter fields cannot be used individually to create or modify non-struct properties.
* Only references to *a single object type struct property values* can act as default values for struct parameter fields.
