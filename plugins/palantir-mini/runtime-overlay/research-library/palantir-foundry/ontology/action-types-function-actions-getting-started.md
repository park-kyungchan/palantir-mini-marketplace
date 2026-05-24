---
source: https://www.palantir.com/docs/foundry/action-types/function-actions-getting-started/
fetched: 2026-04-20
section: ontology-deep
doc_title: Getting started (function-backed actions)
---

# Getting started (function-backed actions)

This tutorial explains how to create an action type that is backed by an [Ontology Edit function](/docs/foundry/functions/edits-overview/).

## Prerequisites

Start by writing an Ontology edit function that performs the desired edits for your action. This requires:

* Setting up a repository using the functions on objects TypeScript template,
* Importing the relevant object types into your repository, and
* Publishing the Ontology edit function for actions to read.

Functions for use in action types must be annotated with `@OntologyEditFunction()` instead of `@Function()`.

Example function:

```typescript
@OntologyEditFunction()
public addPriorityToTitle(ticket: DemoTicket): void {
    let newTitle: string = "[" + ticket.ticketPriority + "]" + ticket.ticketTitle;
    ticket.ticketTitle = newTitle;
}
```

## Creating a function-backed action

In the **Rules** section, add a single rule of type **Function**. Search for the function you published, and pick the latest version. Configure the inputs to match up to the action parameters. Note that a function rule cannot be combined with [other Ontology rules](/docs/foundry/action-types/rules/#ontology-rules).

When selecting the function, all inputs of the function will automatically be created as parameters and added to the **Parameters** tab.

## Changing function version

By default, if the function logic is changed, the action does not automatically update to match it. You must return to the **Rules** section of the action and upgrade the version of the function.

### Auto upgrades

You can optionally enable auto upgrades for the function that the action is referencing. If enabled, the action will depend on the function at a [version range](/docs/foundry/functions/version-range-dependencies-for-functions/) and resolve the version at runtime.

Auto upgrades are disabled for function versions of the form `0.y.z`. These versions are reserved for initial development where function API and behavior may change frequently.

#### Security

If auto upgrades are enabled for a function-backed action, users who do not have edit permissions on the action can modify the action's behavior by making changes to the backing function.

#### Breaking changes

Auto upgrades can result in action execution failures due to breaking changes in bad function releases.

#### Provenance

The provenance of the action is set according to the provenance of the selected minimum function version. The provenance consists only of the object types that the action may edit at runtime.
