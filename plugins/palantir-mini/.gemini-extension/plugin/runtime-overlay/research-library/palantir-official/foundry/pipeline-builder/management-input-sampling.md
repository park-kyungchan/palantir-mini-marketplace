---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/management-input-sampling/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/management-input-sampling/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "58d53d21f48a73a613ab77b85deb0e4b53f07cf0cabd2a3e1c17df4177a3e617"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline management > Add an input sampling strategy"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add an input sampling strategy

If your input datasets are large, you can speed up preview times by adding a sampling strategy to those inputs.

1. Right-click the input node that you would like to sample, then select **Sampling strategies** in the dropdown menu.

<img src="./media/management-sampling-entry-point.png" alt="A dropdown menu with the Sampling strategies option." width="400">

2. From the sampling strategies dialog, select the desired input dataset.

<img src="./media/management-sampling-dialog.png" alt="The sampling strategies dialog." width="800">

3. Choose the **Percentage** strategy, and enter a number between 1 and 100 to downsample your input.

<img src="./media/management-sampling-percentage.png" alt="The sampling strategies dialog configured to use a 20% strategy. " width="800">

4. Close the dialog. A blue badge should now appear on the top right of your input node, indicating that a sampling strategy has been applied.

<img src="./media/management-sampling-badge.png" alt="An input node showing a sampling strategies indicator." width="400">

The preview panel of any nodes downstream of the input will also indicate that sampling was applied.

<img src="./media/management-sampling-downstream.png" alt="Sampling strategies are applied to downstream inputs." width="800">
