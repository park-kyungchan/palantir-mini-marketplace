---
source: https://www.palantir.com/docs/foundry/action-types/parameters-default-value/
fetched: 2026-04-20
section: ontology-deep
doc_title: Set parameter default value
---

# Set parameter default value

Default values prefill action type parameters in the action form. Supported in Workshop, Object Explorer, Object Views, Quiver, and Slate. Centralizing defaults in the action type eliminates the need to configure them in each consuming application.

## Priority: local overrides global

Local default values (Workshop variables, Object View environment variables, Slate defaults) always take precedence over global defaults configured in the action type. Migrating to action-type defaults requires removing local overrides.

## Default value types

### Static default value

A fixed value configured directly in the action type. Example: always prefill `Type` as `A320` for an Aircraft action. Updates to this default are applied globally; no per-application change needed.

### Object property default values

Prefill a parameter from a property on an already-selected object parameter. The referenced object parameter must appear above the current parameter in the form input list.

Example: `Change Airplane Details` action prefills all detail parameters from the current values of the selected `Plane` object, so users can see what they are changing.

### Type class prefills

Annotate a parameter with a type class to prefill special values (auto-generated UUIDs, current user ID). See the Ontology type classes reference for a complete list. Parameters prefilled via type class are typically set to `hidden` visibility to prevent manual override.
