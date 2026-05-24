---
source: https://www.palantir.com/docs/foundry/action-types/marketplace-action-types/
fetched: 2026-04-20
section: ontology-deep
doc_title: Marketplace action types
---

# Marketplace action types

Action types can be packaged and distributed via Foundry DevOps (Marketplace). This enables reuse of action type definitions across Foundry environments.

## Supported features

Marketplace action types support all standard action type features **except** features that depend on environment-specific object type configurations that are not supported in the Marketplace packaging model.

## Submission criteria requirement

When packaging an action type for the Marketplace, submission criteria must reference **groups**, not individual users. User-specific criteria are environment-specific and will not transfer correctly across installations.

## Adding a marketplace action type

You can add a marketplace action type to your environment in two ways:

1. **Product content type** — select it from the Marketplace catalog when installing a product
2. **Dependencies panel** — add it explicitly as a dependency in the Foundry DevOps dependencies panel for your project
