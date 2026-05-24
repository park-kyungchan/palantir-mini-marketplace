---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-docs/add-images/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-docs/add-images/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "853f6984f6048210355d323dedd156b8ac974ea60f31c1591cb259d45b93393e"
product: "foundry"
docsArea: "custom-docs"
locale: "en"
upstreamTitle: "Documentation | Custom documentation > Add images or media to custom docs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add images or media to custom docs

You can use standard Markdown syntax to reference an image file in your documentation repository and display the image in custom docs. The standard Markdown syntax for referencing an image looks as follows:

```
![Descriptive alt text for an image](<location of image>)
```

There are several ways of storing images so that they can be referenced by a custom documentation page.

:::callout{theme="warning"}
We recommend avoiding the use of large GIFs or videos, as they can be difficult to follow and can cause performance issues in the documentation.
:::

### Images stored in the Foundry filesystem

To reference an image in a documentation repository, you can upload the file to the Palantir platform directly and use a Blobster link.

First, upload your image to the Palantir platform via the Foundry filesystem. After the image has been uploaded as a resource in the platform, navigate to the resource, then right-click and select **Copy Image Address**. This address should be formatted `<enrollment_url>/blobster/api/salt/<blobster_rid>`. Use this as the address when referencing the image in Markdown as follows.

```
![Example image using Blobster reference](https://<enrollment_url>/blobster/api/salt/ri.blobster.main.image.<RID>)
```

### Images stored as dataset files

You can also use a dataset file image reference in custom documentation.

```
![Example image with dataset file](/foundry-data-proxy/api/web/dataproxy/datasets/ri.foundry.main.dataset.<RID>/views/master/example.png)
```
