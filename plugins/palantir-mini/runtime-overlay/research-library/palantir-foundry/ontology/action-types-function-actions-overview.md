---
source: https://www.palantir.com/docs/foundry/action-types/function-actions-overview/
fetched: 2026-04-20
section: ontology-deep
doc_title: Function-backed actions overview
---

# Function-backed actions overview

Function-backed actions allow you to perform complex edits that are not possible with standard Ontology rules, such as modifying linked objects, computing values from multiple inputs, or creating multiple object types in a single action.

## When to use function-backed actions

Use function-backed actions when you need to:

* Modify properties on linked objects (not just the primary object)
* Compute values before writing them (e.g., derived fields, formatted strings)
* Create or link multiple object types in one action
* Apply conditional logic that cannot be expressed in standard rules

## Limits

Function-backed actions are subject to **both** action type limits and function execution limits. This means:

* The action must complete within the action type execution time limit
* The function must complete within the function execution time limit
* Object edit scale limits from action types still apply

## Relationship to standard action rules

A function rule cannot be combined with other Ontology rules in the same action type. If a function rule is selected, it is the sole rule for that action type.
