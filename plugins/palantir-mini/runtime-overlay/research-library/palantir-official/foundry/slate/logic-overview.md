---
sourceUrl: "https://www.palantir.com/docs/foundry/slate/logic-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/slate/logic-overview/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e771805f37fd39b61449d2a52dd1d85e892b7ca1b27d5e359e8cacb998bc73e5"
product: "foundry"
docsArea: "slate"
locale: "en"
upstreamTitle: "Documentation | Logic > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Logic

Applications often require data to be modified or enriched before it can be presented to the user or visualized in some other way. Similarly, the application might require additional information to run the way you intend. For example, you may want to indicate that a widget must have the appropriate configuration to run successfully, or that certain information appears based on the state of the application. Slate provides multiple primitives to manage and manipulate states and data.

**Functions** are JavaScript snippets that can read Handlebars and return any type of output. Functions can process data coming from queries, take in states of widgets or variables and construct new values, or prepare classes for widgets. Learn more about [functions in Slate](/docs/foundry/slate/concepts-functions/).

**Handlebars** pass values from one component to another, using the output of a function in a widget or a query in an event. Handlebars give you access to all the information currently flowing through your application via two curly brackets `{{ }}`. Learn more about [using Handlebars in Slate](/docs/foundry/slate/concepts-handlebars/).

**Variables** store values to save a specific state, store user inputs, or set defaults. Set the value for variables via URL parameters or update them via events. Learn more about [variables in Slate](/docs/foundry/slate/concepts-variables/).

**Events** are made up of an individual event and a user action. Events trigger activity in your application; for example, you can configure an Event to submit a query when a button is selected or display a toast after a dialog is closed. Events and actions handle all kinds of automated interactions inside of Slate. Learn more about [Events and Actions in Slate](/docs/foundry/slate/concepts-events/).
