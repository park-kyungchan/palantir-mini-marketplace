---
sourceUrl: "https://www.palantir.com/docs/apollo/recalling-releases/recall-ranges/"
canonicalUrl: "https://palantir.com/docs/apollo/recalling-releases/recall-ranges/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "afaae962053ea139f663e313fe5c2a2d71b9155fc6c71e7405c744f38ee505d5"
product: "apollo"
docsArea: "recalling-releases"
locale: "en"
upstreamTitle: "Documentation | Recalling Releases > Recall ranges"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Recall ranges

After choosing a starting version, you will be prompted to specify a recall range.

<img src="./media/recall-range.png" alt="The recall ranges dropdown." width=600>

This page describes the possible recall ranges in greater detail.

## Open ended recall

Recall all Releases greater than or equal to the starting Release. This recall range includes both existing and future Releases.

One example is when you have not yet published a Release that resolves an issue and want to prevent other developers from accidentally publishing a Release with an existing known bug. Any Releases that are published to Apollo while you are working on a fixed Release will be recalled. After you publish a Release that resolves the issue, you can [edit the recall](/docs/apollo/recalling-releases/recall-release/#edit-a-recall) and change the range to be a closed recall, so that Entities can roll forward to the newest Release.

## Closed recall

Recall all Releases from the starting Release up to but not including another Release.

This range can be used when you know that a specific set of Releases contains an issue, but you have built a newer Release that does not contain the issue.

## Exclude Releases from recall range

In some cases you may want to exclude Releases from an recall range.

This is useful when you backport a Release that fixes the issues. For example, you may discover an issue in all Releases starting at Release 1.2.0. You create an open ended recall so Apollo will not upgrade Entities to the Releases with the issue. Once you publish Release 1.5.0 that resolves the issue, you edit the recall to be a closed recall so that Entities can upgrade to Release 1.5.0. If Release 1.3.0 requires a specific fix, then you publish Release 1.3.1 that fixes the issue. Release 1.3.1 is in the recall range, but you can exclude it so Entities can receive that specific fix.

<img src="./media/exclude-release-from-range.png" alt="Exclude releases from recall range is selected." width=600>

## Single recall

You can use this range to recall a single Release.

Apollo will use a single recall to automatically recall a Release when it discovers an issue during container vulnerability scanning.
