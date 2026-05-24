---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/drag-and-drop-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/drag-and-drop-overview/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9688a2570ff8bf5c8432ebad4b5f743962a53d70da1e6a80356e45a3fec9fb72"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Drag and drop > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Drag and drop

Drag-and-drop functionality allows users to easily move data between applications by dragging it from one application to another. You may have used this functionality when dragging and dropping an image into a folder, as a common example. We will refer to components that you can drag to or from as *drag-and-drop integration points*. By adding just a single drag-and-drop integration point, you can connect your application with other applications that support drag-and-drop capabilities, allowing you to create new workflows.

Drag-and-drop functionality is a widely accepted web standard, allowing for seamless integration between applications. This documentation covers Palantir-specific drag-and-drop recommendations and guides that enable dragging data to and from the Palantir platform. This includes dragging to and from Gotham, Foundry, and user developed applications. Refer to [Palantir media types](#palantir-media-types) for more information on Palantir-specific drag-and-drop functionality.

![Drag and drop between Gotham and Foundry](/docs/resources/foundry/cross-app-interactivity/dnd-gotham-foundry.gif)

## Core concepts

There are four main concepts you should familiarize yourself with to implement drag-and-drop functionality:

1. [The DataTransfer object](#the-datatransfer-object)
2. [Media types](#media-types)
3. [Drag zones](#drag-zones)
4. [Drop zones](#drop-zones)

### The DataTransfer object

The DataTransfer object is like a container that holds information when you move or copy things from one place to another on a computer. DataTransfer objects (also known as "DataTransfers") are used during drag-and-drop actions such as moving a picture from one folder to another, or during copy and paste actions like copying text and pasting it into a document. In the context of drag and drop, the DataTransfer object is also referred to as a drag payload.

DataTransfers can hold different kinds of information, such as text or images. DataTransfer objects were originally made for dragging and dropping specifically, but are now also used for other functions. Refer to [the MDN documentation on DataTransfers ↗](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer) to learn more.

### Media types

Media types, formerly known as MIME types, represent the nature of the data being transferred. Media types are used on the DataTransfer object to identify the kind of data being transferred. For example, a DataTransfer containing the text "Hello" might have a `text/plain` media type, allowing the text to be accessed by components that accept text as a valid media type. Refer to the [MDN documentation on media types ↗](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) to learn more.

A full list of [MDN accepted media types ↗](https://www.iana.org/assignments/media-types/media-types.xhtml) is available for general drag-and-drop functionality. Refer to [Palantir media types](#palantir-media-types) below for more context on Palantir specific functionality.

#### Palantir media types

Palantir media types represent concepts that are specific to the Palantir platform. Adding Palantir-specific drag-and-drop support to your application will enable users to move data between your application and the Palantir platform. We have existing drag and drop zones that accept standard media types, but we recommend adding Palantir media types to your drag payloads when building drag-and-drop workflows to increase interoperability.

The Palantir platform has drag and drop zones that add Palantir media types to the drag payload, or accept drag payloads with these media types. For example, the [object](/docs/foundry/cross-app-interactivity/objects/#foundry-object-resource-identifiers) media type that represents Foundry object resource identifier (RID) data is not a universally used media type, such as `image/jpeg`. Rather, the object media type represents a Palantir-specific concept, and movement of data of this type between applications requires Palantir media support.

Currently supported Palantir media types include [objects](/docs/foundry/cross-app-interactivity/objects/) and [object sets](/docs/foundry/cross-app-interactivity/object-sets/).

### Drag zones

Drag zones are interactive elements on the [document object model (DOM) ↗](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) that allow users to "grab" data and transfer it elsewhere. When a user initiates dragging, a `dragstart` event is fired. Drag zones work by listening to `dragstart` events on DOM elements and adding additional data to the DataTransfer.

![A sample drag zone.](/docs/resources/foundry/cross-app-interactivity/what-is-drag-zone.png)

### Drop zones

Drop zones are interactive elements on the DOM that allow users to transfer data by "dropping" it onto the element. Drop zones work by listening to the `ondrop` event on DOM elements and accessing information from the event's DataTransfer when the event is triggered. For the best user experience, drop zones should be styled to provide visual feedback during drag-and-drop operations. Drop zones can optionally only accept a subset of media types, so visual feedback on whether a media type is valid or invalid for a drop zone makes drag-and-drop functionality more intuitive and user-friendly.

![A sample drop zone.](/docs/resources/foundry/cross-app-interactivity/what-is-drop-zone.png)

## How drag and drop works

To put the concepts together, drag-and-drop interactions are a widely accepted web standard powered by the DataTransfer, which holds the data being dragged by the user. Data is added to the DataTransfer when a drag zone is initially dragged, along with media types corresponding to the type of data being transferred. This data can then be dragged onto drop zones that can gain access to the drag payload. Drop zones can selectively accept data based on the drag payload media type, allowing you to tailor the drag-and-drop interactions available to users.

To understand the technical details behind drag-and-drop functionality, follow the tutorial on [implementing drag-and-drop integration points](/docs/foundry/cross-app-interactivity/tutorial/) and review [Workshop's drag and drop documentation](/docs/foundry/workshop/drag-and-drop/).
