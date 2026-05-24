---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b0427e94f1c5b9b4a2d2f89002fc4d7ee1e640cba6be1a49e1851af177295662"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

### Widget set

A widget set is a Compass resource that represents versions of custom frontend code. Each widget set version can include multiple widgets, and each widget has its own entry point. Widget sets make it easier to manage and publish several widgets that share the same code or assets from a single code repository.

### Widget

A widget is an individual component within a widget set, designed to perform a specific function or display particular content. Widgets are permissioned based on the widget set to which it belongs and declare a configuration shape to interact with its host application (such as Workshop).

### Parameters

Parameters are configurable for each widget, and are designed to allow the host application (such as Workshop) to pass data into the widget. Parameters can currently be passed as primitive values (for example: a string, number, or Boolean) or arrays of primitive values. For a complete list of supported parameter types, see [parameters and events](/docs/foundry/custom-widgets/parameters-and-events/).

### Events

Events are configurable for each widget, and allow widgets a mechanism for updating parameters or signaling that the host application (such as Workshop) should perform some action.
