---
sourceUrl: "https://www.palantir.com/docs/foundry/platform-security-management/manage-project-constraints/"
canonicalUrl: "https://palantir.com/docs/foundry/platform-security-management/manage-project-constraints/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b02ecd78cec9c6449b371c4320caee0b9ac77e86188688addbc14eaac5b6e89f"
product: "foundry"
docsArea: "platform-security-management"
locale: "en"
upstreamTitle: "Documentation | Management > Manage Project constraints"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manage Project constraints

To add a constraint on a Project, you must have an `Owner` role on the Project and add “Apply marking" permissions on all markings added as a Project constraint. You will not be be able to add or modify a Project constraint if doing so would cause an existing file in the Project to be in violation of the constraint you are trying to add.

To manage constraints, navigate to the Markings section in the Access panel to the right.

![Project Constraints - Overview](/docs/resources/foundry/platform-security-management/pmc-1.png)

## Project constraint violations

After a Project constraint is applied, a dataset could still violate the Project constraint if a violating marking was added somewhere upstream and inherited by a dataset in the Project. This is surfaced by a warning on the dataset that is in violation. If the dataset violates the Project constraints, it cannot be built until the violation is resolved.

![A dataset in a Project is marked with a violation warning.](/docs/resources/foundry/platform-security-management/pmc-violation.png)

Project constraint violations can be resolved through the following actions:

* Add this inherited marking as an allowed Project constraint.
* Remove the inputs that introduce the new marking from the necessary transformations.
* Remove the inherited upstream marking. Learn how to [remove markings](/docs/foundry/building-pipelines/remove-markings/) in our documentation.
