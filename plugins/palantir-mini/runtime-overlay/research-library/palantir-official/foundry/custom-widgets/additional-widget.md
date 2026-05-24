---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/additional-widget/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/additional-widget/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f813bddeaf889d64e7220b11374f069c9aaea4a24bd4af9076bec140b9716545"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Add an additional widget to a widget set"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add an additional widget to a widget set

Widget sets allow you to publish multiple widgets from a single code repository for code sharing and performance optimizations. This page explains how to add an additional widget to a widget set and assumes a project structure starting from our provided templates using React, Vite, and [`@osdk/widget.vite-plugin` ↗](https://www.npmjs.com/package/@osdk/widget.vite-plugin).

A widget set can contain a maximum of 50 widgets.

The following example project structure is for a widget set containing two widgets:

```
repo/
├── src/
│   ├── first.tsx
│   ├── first.config.ts
│   ├── second.tsx
│   ├── second.config.ts
│   └── ...
│── first.html
│── second.html
│── vite.config.ts
└─ ...
```

## Define an additional widget

Create a new TypeScript file to define the widget's metadata with `defineConfig` for type safety:

```TypeScript tab="second.config.ts"
import { defineConfig } from "@osdk/widget.client";

export default defineConfig({
  id: "secondWidgetId",
  name: "Second Widget",
  description: "A second widget",
  type: "workshop",
  parameters: {
    ...
  },
  events: {
    ...
  },
});
```

Create a new TypeScript file as the entrypoint to render your widget, and provide the context for parameters and events:

```TypeScript tab="second.tsx"
import { FoundryWidget } from "@osdk/widget.client-react";
import { createRoot } from "react-dom/client";
import Second from "./second.config.js";

const root = document.getElementById("root")!;

createRoot(root).render(
  <FoundryWidget config={Second}>
    {/* Render something for the widget! */}
  </FoundryWidget>,
);
```

## Include the additional widget in the widgets manifest

Create a new HTML file to load the entrypoint script:

```html tab="second.html"
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Widget: Ontology SDK + React</title>
    </head>
    <body>
        <script type="module" src="/src/second.tsx"></script>
    </body>
</html>
```

Configure Vite to include the new HTML file during builds:

```TypeScript tab="vite.config.ts"
import foundryWidgetPlugin from "@osdk/widget.vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [foundryWidgetPlugin()],
  build: {
    rollupOptions: {
      input: ["./first.html", "./second.html"],
    },
  },
});
```

The `.palantir/widgets.config.json` manifest file created in the production build of the widget set should now contain information about your additional widget.

## Publish an additional widget

Follow the instructions in our [documentation](/docs/foundry/custom-widgets/publish/) to publish a new version of the widget set. Your additional widget will be available for use after publication. Note that you must have a first release of the additional widget before you can continue developing it.
