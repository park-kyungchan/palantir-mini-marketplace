---
sourceUrl: "https://www.palantir.com/docs/foundry/cross-app-interactivity/design-guidelines/"
canonicalUrl: "https://palantir.com/docs/foundry/cross-app-interactivity/design-guidelines/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8fe05d6d70a75514cd77262aa0685e1ddac525a8aeb4d5e120ad93721bbdad6d"
product: "foundry"
docsArea: "cross-app-interactivity"
locale: "en"
upstreamTitle: "Documentation | Drag and drop > Design guidelines"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Design guidelines

Adding appropriate styling to your drop zones is crucial for making them usable and discoverable to users. By styling your drop zones in a consistent manner, you make clear which elements in your application are valid drop zones. In the example below, users would not be aware of this workflow if the drop zones did not provide visual feedback by "lighting up".

![Importance of drop zone user visibility feedback.](/docs/resources/foundry/cross-app-interactivity/dnd-gotham-foundry.gif)

Following the recommended styling ensures that users will have a cohesive experience when dragging data between your application and the Palantir platform. This will clarify and improve the user experience, as applying custom styling might add confusion to the different drop zone states and end behaviors.

We provide design standards for the following concepts:

1. **[Drop zones](#drop-zones):** Show users where to drop their drag payload.
2. **[Toasts](#toasts):** Provide feedback on drop success or failure.
3. **[Dialogs](#dialogs):** Provide options for user decisions on where to send dropped data.

## Drop zones

We recommend applying styling for three different states: valid drop, invalid drop, and loading. For all of these states, we recommend applying different styles when the drag payload hovers over the drop zone.

### Drop zone states

#### Valid drop

This style should be applied when your drop zone accepts the current drag payload. For example, if the drop zone accepts the [Gotham object](/docs/foundry/cross-app-interactivity/objects/#gotham-object-identifiers) media type and the user starts dragging a Gotham object, the "valid drop" styling should be applied to the drop zone.

#### Invalid drop

This style should be applied when your drop zone does not accept the current drag payload. This lets users know that they cannot drop their current drag payload onto a given drop zone because it does not contain a valid media type. For example, if the drop zone only accepts the [Gotham object](/docs/foundry/cross-app-interactivity/objects/#gotham-object-identifiers) media type and the drag payload contains the `text/html` media type, the "invalid drop" styling should be applied to the drop zone.

#### Loading

This style should be applied if the drop zone has to perform asynchronous work in order to determine whether it accepts the current drag payload. On the Palantir platform, loading styles are applied while data is being enriched.

See below for an overview of our drop zone styles and see the [Blueprint documentation ↗](https://blueprintjs.com/docs/#core/colors) for recommended colors.

![Drop zone style cheat sheet](/docs/resources/foundry/cross-app-interactivity/drop-zone-cheat-sheet.png)

### Small drop zones

These styles should be applied to smaller drop zones in your application, such as drop zones in the tab bar or in form input fields.

![Small drop zone](/docs/resources/foundry/cross-app-interactivity/small-drop-zone.png)

<details>
<summary>CSS Snippets</summary><br/>
<br/>

#### Loading

```css
.loading-small {
    background: rgba(143, 153, 168, 0.5); // gray3 50%
    border: 1px dashed #F6F7F9; // light-gray5
}

.loading-small-drag-hover {
    border: 1px solid #F6F7F9; // light-gray5
}
```

#### Not Valid

```css
.not-valid-small {
    background: rgba(18, 21, 24, 0.6); // black 60%
}
```

#### Valid

```css
.valid-small {
    background: rgba(24, 74, 144, 0.5); // blue1 50%
    border: 2px dashed #8ABBFF; // blue5
}

.valid-small-drag-hover {
    border: 2px solid #8ABBFF; // blue5
}
```

</details>

### Medium drop zones

These styles should be applied to medium drop zones in your application, such as object cards.

![Medium drop zone](/docs/resources/foundry/cross-app-interactivity/medium-drop-zone.png)

<details>
<summary>CSS Snippets</summary><br/>
<br/>

#### Loading

```css
.loading-medium {
    background: rgba(143, 153, 168, 0.5); // gray3 50%
    border: 1px dashed #F6F7F9; // light-gray5
}

.loading-medium-drag-hover {
    border: 1px solid #F6F7F9; // light-gray5
}
```

#### Not Valid

```css
.not-valid-medium {
    background: rgba(18, 21, 24, 0.6); // black 60%
}
```

#### Valid

```css
.valid-medium {
    background: rgba(24, 74, 144, 0.2); // blue1 20%
    border: 2px dashed #8ABBFF; // blue5
}

.valid-medium-drag-hover {
    border: 2px solid #8ABBFF; // blue5
}
```

</details>

### Large drop zones

These styles should be applied to large drop zones in your application, such as an entire map.

![Large drop zone](/docs/resources/foundry/cross-app-interactivity/large-drop-zone.png)

<details>
<summary>CSS Snippets</summary><br/>
<br/>

For large drop zone styles, we apply different inner and outer styles.

#### Loading

```css
.loading-inner-large {
    background: rgba(143, 153, 168, 0.25); // gray3 25%
    border: 3px dashed #F6F8F9; // light-gray5
    border-radius: 5px;
    color: #F6F8F9; light-gray5
}

.loading-inner-large-drag-hover {
    border: 3px solid #F6F8F9; // light-gray5
}

.loading-outer-large {
    background: rgba(143, 153, 168, 0.25); // gray 25%
    border-radius: 5px;
}
```

#### Not Valid

```css
.not-valid-large {
    background: rgba(18, 21, 24, 0.6); // black 60%
    color: rgba(246, 248, 249, 0.6); // light-gray5 60%
}
```

#### Valid

```css
.valid-inner-large {
    background: rgba(24, 74, 144, 0.25); // blue1 25%
    border: 3px dashed #8ABBFF; // blue5
    border-radius: 5px;
    color: #F6F7F9; // light-gray5
}

.valid-inner-large-drag-hover {
    border: 3px solid #8ABBFF; // blue5
}

.valid-outer-large {
    background: rgba(24, 74, 144, 0.25); // blue1 25%
    border-radius: 5px;
}
```

</details>

## Toasts

We recommend using the following toasts to communicate information about the status of dropped data. You can implement these toasts using the [Blueprint toast component ↗](https://blueprintjs.com/docs/#core/components/toast).

### Loading after drop

Display this toast if additional processing of dropped data must happen before the application is updated with the transferred data. This may happen if the drop zone needs to enrich the data before something can be done with it. Loading toasts should surface while data is enriching.

### Valid drop after data enrichment

Display this toast if the drop was valid and the application was able to make use of the dropped data. Success toasts should disappear after 750 milliseconds.

### Invalid drop after data enrichment

Display this toast if the drop zone initially accepted the drag payload but was unable to use the data after it was dropped. This toast should remain until closed by the user.

### Too many dropped IDs

Display this toast if the drop zone can only handle one instance of the dropped media type. The application will then only use the first item from the dropped data. This toast should remain until closed by the user.

![Toasts](/docs/resources/foundry/cross-app-interactivity/toasts.png)

## Dialogs

For cases where dropped item(s) require further user decisions and have more than one option, use a dialog prompt with a description of how the user should take action. Customize the dialog body based on the use case and intended interaction. Examples of this are shown below:

![Drop dialog](/docs/resources/foundry/cross-app-interactivity/dialogs.png)
