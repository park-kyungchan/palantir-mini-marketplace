---
source: https://www.palantir.com/docs/foundry/action-types/parameter-performance-considerations/
fetched: 2026-04-20
section: ontology-deep
doc_title: Performance considerations for parameter configuration
---

# Performance considerations for parameter configuration

Dependencies between parameters (default values, multiple-choice options) can impact action form load time. Dependencies are evaluated iteratively: each dependent parameter must wait for the parameter it references to resolve.

## Example of a slow dependency chain

1. Parameter 1: `object reference` with a `from single result of object set` default value.
2. Parameter 2: string with default value from `object parameter property` referencing Parameter 1.
3. Parameter 3: string with `multiple choice` from `get options from an object set`; object set references Parameter 2.

This chain forces 3 sequential operations before the form is fully interactive.

## Recommendation

Keep the dependency hierarchy as flat as possible. In the example above, if Parameter 3's object set references Parameter 1 instead of Parameter 2, the second and third parameter values can be derived in parallel, reducing total latency.
