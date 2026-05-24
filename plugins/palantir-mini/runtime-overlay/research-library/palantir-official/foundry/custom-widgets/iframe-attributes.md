---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/iframe-attributes/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/iframe-attributes/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2a9c8b15e19cefa84268ef6fdcc8cdbeb75ef484b4139452d626b5a4df7e8d06"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Enable additional iframe attributes"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Enable additional iframe attributes

:::callout{theme="neutral"}
Certain browser permissions, such as camera and microphone access, always require application users to grant permission to Foundry through a browser prompt. Enabling the iframe attributes allows the application to request access, but the user must still grant permission explicitly. Refer to the [Permissions Policy documentation ↗](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy#relationship_with_the_permissions_api) for more information.
:::

The custom widgets runtime uses an [`<iframe>` ↗](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) element with restrictive attributes that disallow certain browser features, such as popups and camera access, by default. However, widget developers can enable a subset of attribute values for a custom widget. The application builder must then manually grant permission to the requested attribute values for them to take effect. Often, the widget developer and application builder are the same person.

## Available iframe attributes

Widget developers can request enablement of the following iframe attributes:

[`allow` ↗](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#allow) attribute values:

* `camera`
* `microphone`
* `autoplay`

[`sandbox` ↗](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) attribute values:

* `allow-downloads`
* `allow-forms`
* `allow-popups`

## Declare requested iframe attributes

Widget developers can declare requested iframe attributes in the `permissions` field of their custom widget configuration:

```typescript
export default defineConfig({
    id: "widgetId",
    name: "A custom widget",
    description: "A widget description",
    type: "workshop",
    parameters: {},
    events: {},
    permissions: ["camera", "allow-popups"],
});
```

## Allow requested iframe attributes in a host application

:::callout{theme="neutral"}
Opting in to certain iframe attributes may require the application builder to acknowledge a [checkpoint](/docs/foundry/checkpoints/overview/).
:::

In Workshop, application builders can grant permission to requested iframe attributes when configuring a custom widget. The **Permissions** section, found after the **Parameters** and **Events** sections, displays these settings.

![The Permissions section when configuring a custom widget in Workshop.](/docs/resources/foundry/custom-widgets/workshop-iframe-attributes.png)

During development, the widget developer can temporarily permit the requested iframe attributes for testing; they can then use the [custom widgets playground](/docs/foundry/custom-widgets/development/#custom-widgets-playground) environment or [VS Code workspace](/docs/foundry/custom-widgets/development/#vs-code-workspaces-integration) without needing to explicitly grant permission.

## Examples

### Camera and microphone

The following example requires the `camera` and `microphone` iframe allow attribute values to be enabled.

The [`navigator.mediaDevices.getUserMedia` ↗](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) method may be used to prompt the user for permission to use a media input (the camera and microphone in this example) and returns a [`MediaStream` ↗](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) object if successful.

```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
});
```

Additionally, the [Permissions API ↗](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) may be used to query the current status of browser permissions. The returned values may be `"granted"`, `"prompt"` or `"denied"` based on the iframe attributes and user browser prompt status.

```typescript
navigator.permissions.query({ name: "camera" });
navigator.permissions.query({ name: "microphone" });
```

The widget developer should ensure that cases where attribute access is not available are gracefully handled.

### Autoplay

The following example requires the `autoplay` iframe allow attribute value to be enabled.

The [autoplay ↗](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay#the_autoplay_attribute) attribute may be used on an `<audio>` or `<video>` element to autoplay media.

```tsx
<video src={myVideoSrc} autoplay controls />
```

### Downloads

The following examples require the `allow-downloads` iframe sandbox attribute value to be enabled.

#### Dynamically create a CSV (blob)

A [`Blob` ↗](https://developer.mozilla.org/en-US/docs/Web/API/Blob) can be constructed with the contents of a CSV and downloaded in the browser:

```tsx
<button
    onClick={() => {
        const csv = "a,b,c\n1,2,3";
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, "data.csv");
        URL.revokeObjectURL(url);
    }}
>
    Download CSV
</button>
```

The `triggerDownload` helper function temporarily creates an `<a>` element to trigger the download:

```typescript
function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
```

#### Download static assets included in widget

Two methods are described below for downloading static assets included in a custom widget. Review the [Vite Static Asset Handling ↗](https://vite.dev/guide/assets) documentation for more information.

##### Direct href

:::callout{theme="warning"}
In custom widget dev mode, the dev server provides assets from a different origin (for example, `localhost`) than the custom widget runtime. This behavior may cause the browser to open a new tab rather than trigger a download. However, when using the custom widget in production, the assets will correctly trigger a download.
:::

When using the Vite method to [import a static asset as a URL ↗](https://vite.dev/guide/assets#importing-asset-as-url), the asset URL may be used directly in an `<a>` element `href` attribute together with the `download` attribute:

```tsx
import imgUrl from "./img.png";

<a href={imgUrl} download="img.png" target="_blank" rel="noreferrer">
    Download
</a>;
```

When using the [Vite public directory ↗](https://vite.dev/guide/assets#the-public-directory), the assets in the public directory should be referenced using the root absolute path; for example, `public/img.png` should be referenced as `/img.png` in code:

```tsx
<a href="/img.png" download="img.png" target="_blank" rel="noreferrer">
    Download
</a>
```

##### Alternative fetch blob method

An alternative method uses `fetch`, possibly performs additional processing, then downloads as a [`Blob` ↗](https://developer.mozilla.org/en-US/docs/Web/API/Blob), similar to the method for [dynamically creating a CSV (blob)](#dynamically-create-a-csv-blob). An example of additional processing could be to replace values inside the fetched static asset with user provided input.

When using the Vite method to [import a static asset as a URL ↗](https://vite.dev/guide/assets#importing-asset-as-url) we recommend also enforcing [no inlining ↗](https://vite.dev/guide/assets#explicit-inline-handling) to avoid content security policy (CSP) issues with `data:` URIs:

```tsx
import imgUrl from "./img.png?no-inline";

<button
    onClick={async () => {
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        // optional: perform additional processing
        const objectUrl = window.URL.createObjectURL(blob);
        triggerDownload(objectUrl, filename);
        window.URL.revokeObjectURL(objectUrl);
    }}
>
    Download
</button>;
```

When using the [Vite public directory ↗](https://vite.dev/guide/assets#the-public-directory), the assets in the public directory should be referenced using the root absolute path; for example, `public/img.png` should be referenced as `/img.png` in code:

```tsx
<button
    onClick={async () => {
        const response = await fetch("/img.png");
        const blob = await response.blob();
        // optional: perform additional processing
        const objectUrl = window.URL.createObjectURL(blob);
        triggerDownload(objectUrl, filename);
        window.URL.revokeObjectURL(objectUrl);
    }}
>
    Download
</button>
```

The `triggerDownload` helper function temporarily creates an `<a>` element to trigger the download:

```typescript
function triggerDownload(url: string, filename: string) {
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
```

### Open links

:::callout{theme="neutral"}
When developing in Workshop, we recommend creating a [Workshop event](/docs/foundry/custom-widgets/open-url-in-workshop/) to open links; this method avoids the need to request additional iframe attributes.
:::

The following example requires the `allow-popups` iframe sandbox attribute value to be enabled:

An `<a>` element can be used with the `href` and related attributes to open a link in a new tab:

```tsx
<a href="https://palantir.com/docs" target="_blank" rel="noreferrer">
    Link
</a>
```
