---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-docs/add-callouts/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-docs/add-callouts/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7817a4d8b94d82df2b3737fdb592c247ef13929d17af2c7de32ebda749656ba9"
product: "foundry"
docsArea: "custom-docs"
locale: "en"
upstreamTitle: "Documentation | Custom documentation > Add callouts to custom docs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Callouts in custom documentation

The in-platform custom docs allow the use of HTML to create callouts. There are four available callouts that display information in gray, green, yellow, or red, respectively. Note that Markdown formatting is not available between the `<div>` and `</div>` in the callout; for example, to bold text within a callout you should use the HTML syntax `<strong>This is bold text.</strong>` rather than the Markdown syntax `**This is bold text.**`

![Screenshot of available callouts.](/docs/resources/foundry/custom-docs/callouts.png)

## Gray note callout

This is the default callout style.

```
<div class="pt-callout">
    <h5 class="pt-callout-title">Note</h5>
    Insert text here and it will be a gray note callout.
</div>
```

![Screenshot of gray note callout.](/docs/resources/foundry/custom-docs/note-callout.png)

## Green success callout

This callout is used to give tips, recommendations, and other positive information to the reader.

```
<div class="pt-callout pt-intent-success">
    <h5 class="pt-callout-title">Success</h5>
    Insert text here and it will be a green success callout.
</div>
```

![Screenshot of green success callout.](/docs/resources/foundry/custom-docs/success-callout.png)

## Yellow warning callout

This callout is used to draw the reader's attention to important information that could impact a workflow.

```
<div class="pt-callout pt-intent-warning">
    <h5 class="pt-callout-title">Warning</h5>
    Insert text here and it will be a yellow warning callout.
</div>
```

![Screenshot of yellow warning callout.](/docs/resources/foundry/custom-docs/warning-callout.png)

## Red danger callout

This callout is used to indicate an irreversible action or a breaking behavior (such as an action that could lead to data loss or workflow failure).

```
<div class="pt-callout pt-intent-danger">
    <h5 class="pt-callout-title">Danger</h5>
    Insert text here and it will be a red danger callout.
</div>
```

![Screenshot of red danger callout.](/docs/resources/foundry/custom-docs/danger-callout.png)
