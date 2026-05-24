---
source: https://www.palantir.com/docs/foundry/action-types/submission-criteria/
fetched: 2026-04-20
section: ontology-deep
doc_title: Submission criteria
---

# Submission criteria

Submission criteria (formerly "validations") are conditions that determine whether an action can be submitted. They encode business logic into data editing permissions to ensure Ontology data quality and governance.

## Example

An airline allows users to change the `Aircraft` linked to a `Flight`. Submission criteria ensure: (1) only flight controllers (group membership check) can submit the action, and (2) only aircraft with operating status `Yes` can be selected.

## Conditions

Each condition is a single comparison between two values. Condition templates:

- **Current User** — checks the submitting user's ID, group memberships (direct or inherited), or multipass attributes (treated as string lists).
- **Parameter** — checks a value provided by action parameters. Supports object parameter properties. Does not support attachment or object set parameters.

### Operators for single values

| Operator | Description |
|----------|-------------|
| is | exact match |
| is not | no match |
| matches | regex match |
| is less than | numeric |
| is greater than or equals | numeric |

### Operators for lists / object reference lists

| Operator | Description |
|----------|-------------|
| includes | at least one left value matches right |
| includes any | overlap between left and right lists |
| is included in | left value is in right list |
| each is | all left values match right |
| each is not | no left value matches right |

## Logical operators

Combine conditions using AND / OR / NOT. Operators can be nested. An action can only be submitted when all root-level criteria pass.

## Failure messages

Each condition and logical operator at root level has its own failure message. When a condition fails, the corresponding failure message is shown to the user across Workshop, Object Explorer, Quiver, and Slate.
