---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-vulnerabilities/promotion-evaluation-security/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-vulnerabilities/promotion-evaluation-security/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "510f6828fe572dc47987e2e179159105ef5b0544f5cb64b7e77e3242a2b7364c"
product: "apollo"
docsArea: "managing-vulnerabilities"
locale: "en"
upstreamTitle: "Documentation | Managing Vulnerabilities > Add security information to promotion evaluation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add security information to promotion evaluation

There are two labels that you can add as Release Channel requirements to gate the promotion of Releases based on vulnerability scans:

* [Gate promotion on scans being run](#gate-promotion-on-scans-being-run)
* [Gate promotion on the results of scans](#gate-promotion-on-the-results-of-scans)

<img alt="A Release Channel that has two label requirements based on vulnerability scanning." src="./media/label-requirements-for-security.png" width=600>

## Gate promotion on scans being run

:::callout{theme="neutral"}
We recommend this option if you want to prevent vulnerabilities in *all* your Environments and you have [automatic recall based on vulnerabilities](/docs/apollo/managing-vulnerabilities/vulnerability-scanning/#automatic-recalls-based-on-vulnerabilities) enabled. This will ensure that enough time has passed for a scan to run before Releases are installed in your Environments.
:::

Apollo will add a [Product Release label](/docs/apollo/managing-labels/create-labels/) called `vulnerability-scanner.palantir.build/security-scanned` to all Product Releases that have gone through vulnerability scanning. This label can have the values `true` and `false`.

To gate Release promotion on a security scan being run:

1. Create an additional Release Channel, for example, `SECURE`.
2. Add a [label requirement](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) to this Release Channel so that all Releases must have the `vulnerability-scanner.palantir.build/security-scanned` label. Toggle on **Require value** and enter `true`.

## Gate promotion on the results of scans

:::callout{theme="neutral"}
We recommend this option if you want to be more permissive with vulnerabilities in certain Environments and do not yet want to enable automatic recalls based on vulnerabilities.
:::

After scanning a Release, Apollo will add a [Product Release label](/docs/apollo/managing-labels/create-labels/) called `vulnerability-scanner.palantir.build/security-scan-outcome` that indicates the result of the scan. This label has two possible values:

* `pass`: No active vulnerabilities were found. The Release may include vulnerabilities that are within a grace period SLA or have been suppressed.
* `fail`: There are active vulnerabilities in the Release that should be remediated or suppressed.

To gate promotion on the results of a security scan:

1. Determine what vulnerability tolerance you have for each of your Release Channels. For example, you may want to only allow vulnerabilities in the `DEV` Release Channel.
2. Add a [label requirement](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) to any Release Channel that should not accept a Release with active vulnerabilities. For example, you might not add this label requirement to your `DEV` Release Channel, but you might add it to `STAGING` and `PRODUCTION`. Enter the label name `vulnerability-scanner.palantir.build/security-scan-outcome`, then toggle on **Require value** and enter `pass`.
