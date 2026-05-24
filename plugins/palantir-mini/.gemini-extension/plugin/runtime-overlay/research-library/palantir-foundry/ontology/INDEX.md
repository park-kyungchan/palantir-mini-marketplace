# palantir-foundry/ontology/ — Structure Index

Structural reference for the current ontology fetch subset.

## Role contract

- Verbatim official docs for the ontology pages that were fetched in the 2026-04-20 batch.
- This subset is useful for action semantics and FoundryTS, but it is not the whole ontology doc surface.

## Coverage snapshot

| Group | Pages |
|-------|-------|
| Action Types | 33 |
| FoundryTS | 12 |

## Gaps that agents must not miss

Not covered in this batch:

- Object Types
- Link Types
- Functions
- Object Views

## Preferred read order

- First action type:
  `action-types-overview.md` -> `action-types-getting-started.md`
- Secure action execution:
  `action-types-permissions.md` -> `action-types-submission-criteria.md`
- Typed time-series work:
  `foundryts.md` -> exact function page
