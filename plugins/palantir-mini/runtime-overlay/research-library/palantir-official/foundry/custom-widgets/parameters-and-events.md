---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/parameters-and-events/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/parameters-and-events/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6623522ad78280fb4f92ad533b4e56dd487a04f8cc6d639ebffb7db5bf2a532d"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Parameters and events"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parameters and events

Parameters and events are the primary mechanisms for widgets to interact with host applications like Workshop. Parameters allow host applications to pass data into the widget, while events enable widgets to communicate back to the host application.

When developing custom widgets, you define parameters to allow users to configure widget behavior and interact with the host application, and you define events to enable two-way communication. This page explains the available parameter types, their formatting requirements, and how to use events.

:::callout{theme="neutral" title="Constraints"}
Widget configuration files have a limit of 50 parameters and 50 events. Parameter and event IDs must be in `camelCase` format.
:::

## Parameters

Parameters allow widgets to share state with the host application. They can be defined as primitive types, arrays of primitive types, and object set types.

### Parameter types

| Type        | Description                 | Format                                      | Example                                                                        |
| ----------- | --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `boolean`   | Boolean values (true/false) | Boolean                                     | `true` or `false`                                                              |
| `date`      | Calendar date               | ISO 8601 format: `YYYY-MM-DD`               | `"2023-12-31"`                                                                 |
| `number`    | Numeric values              | Number                                      | `42` or `3.14159`                                                              |
| `string`    | Text values                 | String                                      | `"Hello World"`                                                                |
| `timestamp` | Date and time with timezone | ISO 8601 format: `YYYY-MM-DDThh:mm:ss.sssZ` | `"2023-12-31T23:59:59.999Z"`                                                   |
| `objectSet` | Object set                  | Object set RID                              | `ri.object-set.main.temporary-object-set.2af08bf0-3feb-416e-9e34-ad604940581b` |

Object set parameters allow you to pass a set of objects between a custom widget and its host application. An object set may contain zero or more objects, either as a fixed list or as a set of filters applied to an object type or interface. An object set parameter should be defined in the widget configuration file with an object type or interface from an Ontology SDK (OSDK).

#### Unavailable parameter types

Types such as object set filters and structs are currently unsupported as first-class parameter types for custom widgets.

### Usage in parameter definitions

When defining parameters in your widget configuration file, use the appropriate type designation:

```TypeScript tab="parameter-examples.ts"
{
  parameters: {
    // Primitive parameter example
    startDate: {
      type: "date",
      displayName: "Start Date"
    },
    // Array parameter example
    tags: {
      type: "array",
      subType: "string",
      displayName: "Tags"
    },
    // Object set parameter example
    flights: {
      type: "objectSet",
      allowedType: Flight,
      displayName: "Flights"
    }
  }
}
```

## Events

Events allow widgets to communicate with the host application (such as Workshop) and trigger side effects or update parameters. Events can be defined in your widget configuration file alongside parameters.

### Defining events

Events are defined in the widget configuration file with the following structure:

```TypeScript tab="events-definition.ts"
{
  events: {
    myEventId: {
      displayName: "Human-readable event name",
      parameterUpdateIds: ["parameter1", "parameter2"],
    },
  },
}
```

The `parameterUpdateIds` field specifies which parameters can be updated when this event is triggered.

## Parameter and event binding in Workshop

In Workshop, widget parameters can be bound to Workshop variables, and widget events can be bound to Workshop events in the Widget setup panel. This allows for two-way communication:

1. Workshop can pass data to widgets through parameter bindings, and a widget can update these parameters by emitting events.
2. Workshop events can also be bound to widget events in order to trigger side-effects in Workshop.

## Examples

Below are complete examples showing both the widget configuration and usage in React.

### Primitive parameters and events

First, define parameters and events in your configuration file:

```TypeScript tab="simpleCounter.config.ts"
import { defineConfig } from "@osdk/widget.client";

export default defineConfig({
  id: "simpleCounter",
  name: "Simple Counter",
  description: "A minimal counter example",
  type: "workshop",
  parameters: {
    name: {
      displayName: "Name",
      type: "string",
    },
    count: {
      displayName: "Count",
      type: "number",
    },
  },
  events: {
    updateCount: {
      displayName: "Update Count",
      parameterUpdateIds: ["count"],
    },
  },
});
```

Then, use these parameters and events in your widget component:

```TypeScript tab="Widget.tsx"
import { useFoundryWidgetContext } from "@osdk/widget.client-react";
import React, { useCallback } from "react";
import type SimpleCounterConfig from "./simpleCounter.config.js";

const useWidgetContext = useFoundryWidgetContext.withTypes<typeof SimpleCounterConfig>();

export const Widget = () => {
  const { parameters, emitEvent } = useWidgetContext();

  const name = parameters.values.name ?? "World";
  const count = parameters.values.count ?? 0;

  const increment = useCallback(() => {
    emitEvent("updateCount", {
      parameterUpdates: { count: count + 1 },
    });
  }, [emitEvent, count]);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
};
```

### Object set parameter

First, define parameters and events in your configuration file:

```TypeScript tab="flights.config.ts"
import { Flight } from "@custom-widget/sdk";
import { defineConfig } from "@osdk/widget.client";

export default defineConfig({
  id: "flights",
  name: "Flights Example",
  description: "An example with flights",
  type: "workshop",
  parameters: {
    flights: {
      displayName: "Flights",
      allowedType: Flight,
      type: "objectSet",
    },
  },
  events: {},
});
```

When using an object set parameter, an OSDK client must be passed into the `FoundryWidget` component. To use the `useObjectSet` hook from `@osdk/react` for data fetching, you must also wrap your widget with `OsdkProvider2`. This provider enables the experimental React hooks that offer automatic caching, loading states, and real-time updates:

```TypeScript tab="main.tsx"
import { FoundryWidget } from "@osdk/widget.client-react";
import { OsdkProvider2 } from "@osdk/react/experimental";
import { createRoot } from "react-dom/client";
import FlightsConfig from "./flights.config.js";
import { client } from "./client.js";
import { Widget } from "./Widget.js";

const root = document.getElementById("root")!;

createRoot(root).render(
  <FoundryWidget config={FlightsConfig} client={client}>
    <OsdkProvider2 client={client}>
      <Widget />
    </OsdkProvider2>
  </FoundryWidget>
);
```

Then, use these parameters and events in your widget component. Since `useObjectSet` cannot be called with a `null` or `undefined` object set, the pattern below uses a separate component that only renders once the object set is available:

```TypeScript tab="Widget.tsx"
import { Flight } from "@custom-widget/sdk";
import type { ObjectSet } from "@osdk/api";
import { useObjectSet } from "@osdk/react/experimental";
import { useFoundryWidgetContext } from "@osdk/widget.client-react";
import React from "react";
import type FlightsConfig from "./flights.config.js";

const useWidgetContext = useFoundryWidgetContext.withTypes<typeof FlightsConfig>();

export const Widget = () => {
  const { parameters } = useWidgetContext();

  const flightsParam = parameters.values.flights;

  if (flightsParam == null) {
    return <div>Select an object set</div>;
  }

  return <FlightsView objectSet={flightsParam.objectSet} />;
};

const FlightsView = ({ objectSet }: { objectSet: ObjectSet<Flight> }) => {
  const { data: flights, isLoading, error } = useObjectSet(objectSet);

  if (isLoading) {
    return <div>Loading flights...</div>;
  }

  if (error) {
    return <div>Error loading flights</div>;
  }

  return (
    <div>
      <p>Flights: {flights?.map(f => ...)}</p>
    </div>
  );
};
```

The value of an object set parameter contains an object set RID as well as an instantiated OSDK object set for convenience. When the object set definition changes, or data is invalidated in the host application, the object set RID and instantiated OSDK object set in the parameter value will update.

:::callout{theme="neutral" title="Learn more about @osdk/react"}
For more information on `useObjectSet` and other React hooks for querying, actions, and caching, see the [official @osdk/react documentation ↗](https://palantir.github.io/osdk-ts/react/getting-started).
:::

### Update an object set parameter

You can update an object set parameter by emitting an event using an OSDK `ObjectSet` to update the parameter.

First, define the event in your configuration file with the object set parameter in `parameterUpdateIds`.

```TypeScript tab="flights.config.ts"
import { Flight } from "@custom-widget/sdk";
import { defineConfig } from "@osdk/widget.client";

export default defineConfig({
  id: "flights",
  name: "Flights Example",
  description: "An example with flights",
  type: "workshop",
  parameters: {
    flights: {
      displayName: "Flights",
      allowedType: Flight,
      type: "objectSet",
    },
  },
  events: {
    updateFlights: {
      displayName: "Update Flights",
      parameterUpdateIds: ["flights"],
    },
  },
});
```

Then, use `emitEvent` to update the object set parameter with a new `ObjectSet`.

```TypeScript tab="Widget.tsx"
import { Flight } from "@custom-widget/sdk";
import { useFoundryWidgetContext } from "@osdk/widget.client-react";
import React, { useCallback } from "react";
import { client } from "./client.js";
import type FlightsConfig from "./flights.config.js";

const useWidgetContext = useFoundryWidgetContext.withTypes<typeof FlightsConfig>();

export const Widget = () => {
  const { parameters, emitEvent } = useWidgetContext();

  const filterToLongFlights = useCallback(() => {
    const longFlights = client(Flight).where({
      duration: { $gt: 500 },
    });

    emitEvent("updateFlights", {
      parameterUpdates: { flights: longFlights },
    });
  }, [emitEvent]);

  return (
    <div>
      <button onClick={filterToLongFlights}>Show Long Flights</button>
    </div>
  );
};
```

:::callout{theme="note" title="Behavior and limitations"}
The SDK creates a temporary object set from your `ObjectSet` definition and sends the resulting RID to the host application. If the same event is emitted multiple times in quick succession, only the last call will be sent. Earlier calls are discarded to prevent race conditions. <br><br>
Errors during object set creation, such as network failures, are not surfaced to the caller.
:::

:::callout{theme="note" title="Refreshing object set data after actions"}
If your widget uses OSDK to apply Ontology actions that modify data in an object set parameter, you can enable automatic data refresh. See [Refresh host data on action](/docs/foundry/custom-widgets/use-osdk/#refresh-host-data-on-action) for details.
:::
