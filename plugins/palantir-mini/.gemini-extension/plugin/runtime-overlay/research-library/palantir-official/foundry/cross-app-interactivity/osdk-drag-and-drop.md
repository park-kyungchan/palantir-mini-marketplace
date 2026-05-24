---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/osdk-drag-and-drop/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/osdk-drag-and-drop/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "66448ba292d7218abd36a2fa042f40800332b4cd0628d97867797b77a085f852"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Drag and drop > Drag and drop between Ontology SDK applications"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Drag and drop between Ontology SDK applications

Palantir provides a [React ↗](https://react.dev) library you can integrate with the [Ontology SDK (OSDK)](/docs/foundry/ontology-sdk/overview/), enabling you to create and implement drag and drop functionality between custom applications. The `@palantir/dnd-osdk-react` library provides type-safe components and hooks you can use to configure [drag and drop zones](/docs/foundry/cross-app-interactivity/drag-and-drop-overview/) to transfer objects and object sets between different parts of your application and other Palantir platform applications, such as [Workshop](/docs/foundry/workshop/overview/), [Object Explorer](/docs/foundry/object-explorer/overview/), or Gaia.

![An Object Explorer results drag zone and Gaia map drop zone interfaces are displayed.](/docs/resources/foundry/cross-app-interactivity/dnd-gaia-object-explorer.png)

## Core library features and key concepts

* **OSDK integration:** Built specifically for Palantir's OSDK with automatic object set hydration and metadata handling.
* **Flexible data support and serialization:** Accepts both OSDK objects and object sets as well as custom data types in the same drop zone. Additionally, the library serializes all object and object set data.
* **Performance optimization:** Uses deep comparison memoization to prevent unnecessary backend calls.
* **Customizable visual feedback:** Offers built-in, customizable support for styling drop zones based on drag state.
* **Object type definition:** You can define which [object types](/docs/foundry/object-link-types/object-types-overview/) your drag and drop zones accept.

![Object Type Specific Drag & Drop](/docs/resources/foundry/cross-app-interactivity/object-type-specific.gif)

* **Object set conversion and transportation:** All dropped objects are automatically converted to object sets for consistent handling across application boundaries.
* **Client integration:** The library requires that you generate an [OSDK client](/docs/foundry/developer-console/oauth-clients/) to enable metadata fetching and object set operations.

## Add the library to Code Workspaces

:::callout{theme="neutral"}
Contact Palantir Support if you are unable to locate the `@palantir/dnd-osdk-react` library in Code Workspaces.
:::

To begin building with the OSDK and the `@palantir/dnd-osdk-react` library, navigate to [Code Workspaces](/docs/foundry/code-workspaces/overview/) and create a new [VS Code workspace](/docs/foundry/vs-code/overview/) with **React** as the repository type.

![The React repository type is displayed from the type selection menu in Code Workspaces.](/docs/resources/foundry/cross-app-interactivity/create-new-react-repo.png)

Search for and select the `@palantir/dnd-osdk-react` library from your workspace's **Libraries** panel.

![The drag and drop library is displayed in the Libraries panel of a workspace.](/docs/resources/foundry/cross-app-interactivity/dnd-library-in-code-workspaces.png)

Once you add the library to your workspace, you will be able to use its hooks and components to handle drag and drop workflows across custom OSDK and Palantir platform applications. Review the examples below to help you get started.

### Example: Create a drag zone

Use the `OsdkObjectDragZone` component to render OSDK object data as draggable. When your application's users drag the content, then the associated object data is automatically included in the drag payload.

To create a drag zone with an object set, you can reference the code sample below which:

1. Imports the specific object types from your generated OSDK, which you will use to construct object sets or singular objects for your drag zone.
2. Uses a generated OSDK client to create object sets that represent queries or collections of objects. Alternatively, you can use previously fetched object instances.
3. Places relevant [JSX ↗](https://react.dev/learn/writing-markup-with-jsx) content inside the `OsdkObjectDragZone` component, ensuring the content is draggable.
4. Configures the `client` to reference a generated OSDK client and an `objectSet` that will be included in the drag payload.

```typescript
import { MyObjectType } from "@my-osdk-lib/sdk"; // Import your object type
import { OsdkObjectDragZone } from "@palantir/dnd-osdk-react";
import client from "./client";
import { ObjectSet } from "@osdk/api";

// create an object set from MyObjectType
const objectSet = client(MyObjectType);

function ObjectSetDragExample() {
    return (
        <div>
            <OsdkObjectDragZone client={client} objectSets={objectSet}>
                <p>Drag me!</p>
            </OsdkObjectDragZone>
        </div>
    );
}

export default ObjectSetDragExample;
```

### Example: Create a drop zone

Use the `OsdkObjectDropZone` component to render OSDK object data as droppable. When your application's users drop the content, then the component automatically handles object data deserialization and provides the dropped object data.

To create a drop zone with an object set, you can reference the code sample below which, like the [drag example above](#example-create-a-drag-zone), imports an object type and generated OSDK client.

```typescript
import { MyObjectType } from "@my-osdk-lib/sdk"; // Import your object type
import { OsdkObjectDropZone } from "@palantir/dnd-osdk-react";
import client from "./client";
import { ObjectSet } from "@osdk/api";

// Restrict drop zone to only accept MyObjectType
const acceptedObjectTypes = [MyObjectType];

// Define actions that occur when objects are dropped
const handleObjectSetsDrop = React.useCallback<
  OnOsdkObjectSetsDrop<[MyObjectType]>
>(async (objectSetsByApiName) => {
  // Access dropped object sets by their API name
  const myObjectObjectSets = objectSetsByApiName.MyObjectType;
  ...
}, []);
```

Next, configure the drop zone component.

```typescript
import styles from "./DropZoneExample.module.css";

<OsdkObjectDropZone
    client={client} // Your OSDK client instance
    acceptedObjectTypes={acceptedObjectTypes} // Defines which object types to accept
    onObjectSetsDrop={handleObjectSetsDrop} // Serves as a drop handler function
    className={styles.dropZone} // Sets drop zone base styling
    acceptedClassName={styles.dropZoneAccepted} // Sets drop zone styling when drag payload is accepted
>
    <p>Drop objects here!</p>
</OsdkObjectDropZone>;
```

The full example below creates a drop zone that accepts objects and object sets within the `MyObjectType` object type. When objects are dropped, the zone fetches the first 100 objects from the dropped object set and displays them in a list alongside a **Clear** button. The example uses the `@blueprintjs/core` library for all user interface components, such as the **Clear** button.

```typescript
import {
    OnOsdkObjectSetsDrop,
    OsdkInstanceObjects,
    OsdkObjectDropZone,
} from "@palantir/dnd-osdk-react";
import { MyObjectType } from "@my-osdk-lib/sdk";
import React from "react";
import client from "./client";
import { Button, Card, CardList } from "@blueprintjs/core";
import styles from "./DropZoneExample.module.css";

// Accept only MyObjectTypes
const acceptedObjectTypes = [MyObjectType];

export function MyObjectTypeDropZoneExample() {
    const [loadedObjects, setLoadedObjects] = React.useState<
        OsdkInstanceObjects<[typeof MyObjectType]>
    >([]);

    const handleObjectSetsDrop = React.useCallback<
        OnOsdkObjectSetsDrop<[MyObjectType]>
    >(async (objectSetsByApiName) => {
        // Access dropped object sets by their API name
        const myCoolObjectObjectSets = objectSetsByApiName.MyObjectType;

        const firstObjectSet = myCoolObjectObjectSets?.[0];

        // If no object set was dropped, exit early
        if (firstObjectSet == null) {
            return;
        }

        // Fetch the first 100 objects from the dropped object set
        const objects = (
            await firstObjectSet.fetchPage({
                $pageSize: 100,
                $includeRid: true,
            })
        ).data;

        // Update state with the loaded objects
        setLoadedObjects(objects);
    }, []);

    const handleClear = React.useCallback(() => {
        // Clear the loaded objects when the clear button is clicked
        setLoadedObjects([]);
    }, []);

    return (
        <div>
            <h2>Drop Zone Example</h2>
            <div>
                <OsdkObjectDropZone
                    client={client} // OSDK client instance
                    className={styles.dropZone} // Base styling for the drop zone
                    acceptedClassName={styles.dropZoneAccepted} // Styling when drag payload is accepted
                    acceptedObjectTypes={acceptedObjectTypes} // Which object types to accept
                    onObjectSetsDrop={handleObjectSetsDrop} // Drop handler function
                >
                    <p>Drop MyObjectTypes here!</p>
                </OsdkObjectDropZone>

                <div>
                    {/* Conditionally render either a clear button or empty state message */}
                    {loadedObjects.length > 0 ? (
                        // If objects have been dropped and loaded, show a clear button with count
                        <Button onClick={handleClear} intent="primary">
                            Clear ({loadedObjects.length} objects)
                        </Button>
                    ) : (
                        // If no objects have been loaded yet, show instructional text
                        <div className={styles.emptyState}>
                            Dropped objects will appear here once you drop them
                            into the drop zone.
                        </div>
                    )}

                    {/* Render the list of dropped objects using Blueprint CardList */}
                    <CardList bordered={true}>
                        {loadedObjects.map((object) => (
                            <Card key={object.$rid} interactive={true}>
                                {/* Display the object's title using the $title property */}
                                <h4>{object.$title}</h4>
                            </Card>
                        ))}
                    </CardList>
                </div>
            </div>
        </div>
    );
}
```

[Learn more about building custom OSDK React applications.](/docs/foundry/ontology-sdk-react-applications/overview/)
