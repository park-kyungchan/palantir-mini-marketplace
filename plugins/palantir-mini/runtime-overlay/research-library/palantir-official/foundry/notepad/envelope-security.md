---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/envelope-security/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/envelope-security/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e0504f63f54d98b2f353a73bb8cc5997f5747e562f4d04cc608bc8f70f80fea9"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Notepad > Envelope security"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Envelope security \[Beta]

:::callout{theme="neutral" title="Beta"}
Envelope security in Notepad is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and is only available on enrollments that use [Classification-based Access Controls](/docs/foundry/security/classification-based-access-controls/) (CBAC). The set of supported widgets and document features will expand in future releases. Contact Palantir Support to request access to envelope security if it is not available on your CBAC-enabled enrollment.
:::

**Envelope security** restricts the data Foundry can load inside a Notepad document to a security boundary defined by the document's own CBAC classification and [markings](/docs/foundry/security/markings/). When you enable envelope security on a document, the document's [file markings](/docs/foundry/security/classification-based-access-controls/#file-and-data-classification) restrict the data that can be added and viewed in the file instead of using each individual user's marking membership to determine what they can view. A Notepad document with envelope security is consistent across viewers, and you can safely export the document with a banner that accurately reflects the classification of its contents.

## When to use envelope security

Apply envelope security to a document when the security of its content must be enforced and communicated independently of the [scoped session](/docs/foundry/administration/configure-scoped-sessions/) a user is working in. Additionally, you can use envelope security in Notepad when you need to:

* Author a document whose content must remain at or below a specific classification, regardless of the access level of the user editing the document.
* Export a document with a banner that reflects the document's own classification, rather than the user's session-high banner.
* Share a document where the contents must be the same for every authorized viewer.

If you do not need these guarantees, use a regular Notepad document which supports the full set of [widgets](/docs/foundry/notepad/embed-widgets/) while filtering dynamically loaded content for each viewer based on their marking membership.

## Create an envelope-secured document

Follow the instructions below to create a document with envelope security from the standard Notepad creation dialog.

1. Select **+ New** > **Notepad document** to create a new Notepad document from a [Project](/docs/foundry/security/projects-and-roles/).
2. Toggle on **Mandatory security** to enable envelope security. The document's classification and markings will match the [project classification](/docs/foundry/security/classification-based-access-controls/#project-classification) and project markings of the containing Project.
3. Select **Done** to create the document.

![The Notepad creation dialog with the Mandatory security toggle enabled to apply envelope security.](/docs/resources/foundry/notepad/notepad_envelope_security_creation_dialog.png)

You cannot enable or disable envelope security after you create a document. To convert between an envelope-secured and a regular Notepad document, create a new document of the desired type. Additionally, you cannot assign classifications to an envelope-secured document that differ from those of its Project. The classification of an envelope-secured Notepad document must match the classification of its containing Project upon creation.

Just like in a regular document, after you create an envelope-secured document in Notepad you will be able to view its [outline](/docs/foundry/notepad/document-outline/), [version history](/docs/foundry/notepad/version-history/), and [print options](/docs/foundry/notepad/export-pdf/#specific-print-options).

## Banner display

Envelope-secured documents display a banner derived from the document's file markings.

![An envelope-secured Notepad document displaying the file markings banner around the document.](/docs/resources/foundry/notepad/notepad_envelope_security_banner.png)

* **When viewing the document in Notepad:** Notepad renders a banner at the top of the document that is visible whenever the document is open.
* **After exporting the document to PDF or Word:** The exported document uses the file markings banner. The custom export banner picker is disabled for envelope-secured documents.
* **When viewing the embedded document in Workshop:** Workshop renders the file markings banner around the embedded document in addition to the Workshop session banner.

## Supported widgets

Envelope-secured documents currently support a limited set of widgets that do not load data dynamically:

* [Anchor link](/docs/foundry/notepad/widgets-anchor-link/)
* [Horizontal rule](/docs/foundry/notepad/widgets-horizontal-rule/)
* [LaTeX](/docs/foundry/notepad/widgets-latex/)
* [Page break](/docs/foundry/notepad/widgets-page-break/)
* [Table](/docs/foundry/notepad/widgets-table/)
* [User mention](/docs/foundry/notepad/widgets-user-mention/)

Notepad filters the **+ Widget** menu in envelope-secured documents to display only the supported widgets listed above, including the menu used in [headers and footers](/docs/foundry/notepad/embed-widgets/).

## Unsupported functionality

The following Notepad features are not available in envelope-secured documents:

* **Templates:** You cannot create envelope-secured documents from a [template](/docs/foundry/notepad/templates-overview/), and you cannot save an envelope-secured document as a template.
* **Marketplace packaging:** You cannot package envelope-secured documents into a [Marketplace product](/docs/foundry/notepad/marketplace-notepad/).
* **Lock and unlock widget data:** Because no data-loading widgets are supported, [locking and unlocking widget data](/docs/foundry/notepad/snapshot-widgets/) is not exposed.
* **Referenced data panel:** The referenced data panel in the left sidebar is hidden, since no widgets in the document load referenced resources.
* **Edit with AIP and Edit with functions:** AIP-based editing is disabled, as marked content cannot be passed to arbitrary functions.
* **App Pairing:** [App Pairing](/docs/foundry/cross-app-interactivity/app-pairing/) is not supported, since it is used in conjunction with the unsupported [Command widget](/docs/foundry/notepad/widgets-command/).
* **Add to AIP Assist:** Adding envelope-secured documents to AIP Assist is not supported.
* **Add automation:** You cannot configure an [Automate integration](/docs/foundry/automate/integrations/#notepad) on envelope-secured documents.

## Edit an envelope-secured document

Edit an envelope-secured document following the same workflow you use to edit a regular Notepad document, with the following differences:

* Pasting content that contains unsupported widgets, such as copying content from a regular Notepad document, removes those widgets from the pasted content.
* Notepad rejects updates that would insert unsupported widgets into the document. If a paste or other edit fails validation, the change will not be applied and the page will automatically refresh.

![The +Widget menu in an envelope-secured Notepad document, filtered to show only supported widgets.](/docs/resources/foundry/notepad/notepad_envelope_security_widget_menu.png)

## Duplicate and move envelope-secured documents

When you duplicate an envelope-secured Notepad document, the duplicate retains the same classification and markings as the original document, regardless of the destination Project's classification.

When you move an envelope-secured document into a different Project, the document's classification and markings remain unchanged. The document's classification must fall within the destination Project's allowed classification range, between its [project classification](/docs/foundry/security/classification-based-access-controls/#project-classification) and [project maximum classification](/docs/foundry/security/classification-based-access-controls/#project-maximum-classification), to ensure it remains accessible.
