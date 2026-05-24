---
source: https://www.palantir.com/docs/foundry/action-types/parameters-filter/
fetched: 2026-04-20
section: ontology-deep
doc_title: Filter results of a parameter dropdown
---

# Filter results of a parameter dropdown

Filters on parameters restrict the allowed values shown in the parameter dropdown.

## Multiple choice parameter dropdowns

Configure a multiple choice parameter to get options from an object set: select a property from that object set as the source of allowed values. If a single object is in the resulting set and the parameter is required, the dropdown auto-prefills. Options shown respect the user's object visibility permissions.

## Object dropdowns

For object reference parameters, configure filters and Search Arounds to restrict which objects appear in the dropdown. The selected value is also validated before the action executes.

### Supported operations

**Filter on a property** — show only objects where a property matches a given value. Values can be: static, from another parameter, or from a property of an object reference parameter. Multiple values create an OR condition.

**Change the starting object set** — default starting set is all objects of the object type; can be changed to any other type or to an `ObjectReference` list parameter.

**Search Arounds** — traverse a link on every object in the current set to create a new set. Example: traverse "Github Issue of Current Employee" to derive `Github Issues` from `Employees`.

### Data privacy

Static value filters in object dropdowns may expose sensitive property values to users who cannot view the filtered objects. See [dropdown security considerations](action-types-dropdown-security.md).
