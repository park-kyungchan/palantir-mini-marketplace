---
sourceUrl: "https://www.palantir.com/docs/foundry/sensitive-data-scanner/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/sensitive-data-scanner/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a833081be54edcb0c716aa1d844f64ea2f8b1f27325b606cacecda19fa138427"
product: "foundry"
docsArea: "sensitive-data-scanner"
locale: "en"
upstreamTitle: "Documentation | Sensitive Data Scanner > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

Sensitive Data Scanner is built on the core concepts of [match conditions](#match-conditions), [match actions](#match-actions), and scans. Scans can be either [one-time](#one-time-scans) or [recurring](#recurring-scans).

## Match conditions

Match conditions are predefined patterns that Sensitive Data Scanner uses to identify sensitive data based on data format or values. There are two types of match conditions:

* **Regular expression match conditions:** A match condition that is specified via regular expression (regex). A regular expression is a sequence of characters representing patterns for matching text. For users unfamiliar with regular expressions, AIP can help create valid regular expressions that match the desired sensitive data.
* **Overlap match conditions:** An overlap match condition allows users to search for exact duplicates of predefined sensitive data (such as a list of names) by matching against the values in a column in an existing Foundry dataset already known to contain such data.

![Screenshot of Create a match condition popover requesting the selection of a type of match condition](/docs/resources/foundry/sensitive-data-scanner/create-match-condition-modal-start.png)

Users can create their own *custom* match conditions to cover the types of personally identifiable information (PII) they care about. Sensitive Data Scanner also provides a range of predefined *built-in* match conditions to detect common types of PII, such as Social Security numbers, e-mail addresses, and phone numbers.

## Match actions

Match actions allow users to define automated actions for how sensitive data should be handled in-platform. Users can create three types of match actions:

* **Create Issues:** Users can set up a match action to create Issues on columns where a match is found, which enables governance teams to manually review and triage matches detected by Sensitive Data Scanner.
* **Apply Marking(s):** Users can set up a match action to apply one or more [Markings](/docs/foundry/security/markings/) to any dataset where a match is found in order to ensure access controls.
* **Obfuscate Data:** Users can set up a match action to obfuscate matched data by encrypting or hashing it using [Cipher](/docs/foundry/cipher/overview/).

![Screenshot of Select match actions popover](/docs/resources/foundry/sensitive-data-scanner/select-match-actions.png)

## One-time scans

A one-time sensitive data scan performs a single search of the datasets selected by the user based on the match conditions and performs the specified match actions on any matches. One-time scans are helpful to identify data already in Foundry which is not in line with an organization’s data governance policy.

## Recurring scans

A recurring sensitive data scan is similar to a one-time scan, except that a recurring scan takes place whenever new data is added to the datasets selected by the user. Recurring scans can provide ongoing and continuous assistance in identifying potentially non-compliant data, even as new data is added to the platform.
