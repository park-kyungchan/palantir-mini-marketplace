---
sourceUrl: "https://www.palantir.com/docs/foundry/sensitive-data-scanner/media-set-scanning/"
canonicalUrl: "https://palantir.com/docs/foundry/sensitive-data-scanner/media-set-scanning/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "829740fa81499f3d581ba588163b0b11c2a17b272393fd4e57311b66f170e5fc"
product: "foundry"
docsArea: "sensitive-data-scanner"
locale: "en"
upstreamTitle: "Documentation | Sensitive Data Scanner > Media set scanning"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Media set scanning

Sensitive Data Scanner (SDS) can scan media sets for data matching a particular regex. SDS will convert the media items in a media set to text, and then run the regex against the extracted text. The text extraction method used will depend on the type of the media set being scanned.

Text extraction methods are as follows:

* **Image and PDF media sets:** [Optical character recognition (OCR)](/docs/foundry/transforms-python/media-set-transforms-api/#ocr)
* **Audio media sets:** [Transcription](/docs/foundry/transforms-python/media-sets/#transcribe-audio-to-text)

Media sets can only be scanned with content-only regex [match conditions](/docs/foundry/sensitive-data-scanner/create-match-conditions/#create-a-regex-match-condition).

Issue [match actions](/docs/foundry/sensitive-data-scanner/create-match-actions/#create-a-create-issues-match-action) will automatically be aggregated. This means that for a given media set, even if there are multiple media items that match a given match condition, only a single issue will be opened on the media set.

## Text extraction limitations

OCR and audio transcription may not produce exact replicas of the text in the original media content. For example, OCR may split a single word into two strings, capitalize letters, or incorrectly extract text from images that do not contain text. This can lead to unexpected behavior when matching against a regex, especially if the regex assumes that text will conform to certain formatting or capitalization rules.

To see the text that SDS ran a regex against, you can create a [Pipeline Builder](../pipeline-builder/) pipeline that takes a media set as input and applies the following transforms for media set types:

* **PDF media sets:** [Extract text from PDFs using OCR](/docs/foundry/pb-functions-expression/pdfOcrV1/).
* **Image media sets:** [Extract text from images using OCR](/docs/foundry/pb-functions-expression/imageOcrV1/).
* **Audio media sets:** [Transcribe audio into text](/docs/foundry/pb-functions-expression/audioTranscriptionV1/).

## Inspect media set scanning results

Select the **Open scan details** button to review the scan configuration and inspect the results. Similar to scanned datasets, the **Scan results** section is where SDS lists all the media sets with scan matches as well as their exact match conditions.

![The Open scan details button.](/docs/resources/foundry/sensitive-data-scanner/open-scan-details-button.png)

Hover your cursor over any match condition to render a preview of media items which triggered the match condition.

![The media set scan result preview for a specific match condition.](/docs/resources/foundry/sensitive-data-scanner/media-set-scan-result.png)

You will also see the total number of matched and scanned media items. If a media set contains a large number of matches, then Foundry displays a preview of the first ten.

Select a thumbnail to open a detailed view of the media item for further exploration, such as zooming in on an image or reviewing multi-page documents.

![The media item displayed in the detail view.](/docs/resources/foundry/sensitive-data-scanner/media-item-detail-view.png)

## Optimize SDS performance

SDS extracts text from every media item, so scanning media sets can be computationally expensive. You can use the following strategies to manage compute costs and optimize scan performance:

* **Subset sampling:** To limit computational cost and reduce scan durations, you can leverage [sampling strategies](/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan/#row-selection-strategy) if you only want to scan a subset of the media items in your media set. Analogous to sampling rows of a dataset, these strategies also apply to sampling media items of a media set.
* **Scheduled scans:** If you want to run recurring scans on a media set, you can use a low-frequency [scheduled scan](/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan/#scan-schedule), such as one that runs on a weekly or monthly basis, instead of a continuous scan.

## Incremental Scans

In recurring scans, SDS scans media sets *incrementally*. This means that SDS will scan only media items that have been added or updated since the last successful scan. This significantly reduces the duration and compute required for recurring media scans, as SDS does not need to process already scanned media items.

If a scan was performed incrementally, an info icon will be shown in the scan row of the results table.

![The incremental scan popover.](/docs/resources/foundry/sensitive-data-scanner/incremental_scan.png)

You can open a resource's scan history by selecting View scan history in the scan result's context menu. The scan history displays a timeline of all previous incremental scans, including the number of scanned items and the detected match conditions. The top card of the history view shows you an aggregated overview of all the detected match conditions across all incremental scans. You also have the option to trigger a full re-scan of the entire resource. This is recommended after you delete PII from a dataset, as it helps you verify whether the match condition is still detected, or whether all matching data has been removed.

You can also trigger a full re-scan of the entire resource. Run a full re-scan after you delete PII from a dataset to verify whether the match condition is still detected, or whether all matching data has been removed.

![The scan history view.](/docs/resources/foundry/sensitive-data-scanner/scan_history.png)
