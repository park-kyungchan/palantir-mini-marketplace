---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-changes/change-requests/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-changes/change-requests/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ab6229fd0e9e2048efb62d22efc968630f460b8754327d3af37aecc63a2fff58"
product: "apollo"
docsArea: "managing-changes"
locale: "en"
upstreamTitle: "Documentation | Managing Changes > Change Requests"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Change Requests

Change requests are required for most changes to Environments issued as plans by the Apollo core engine. These can be viewed either globally through the navigation sidebar **Change Requests** app, or for a more specific context through the **Changes** tabs on Environments and installs views.

![Change Requests](/docs/resources/apollo/managing-changes/change_requests.png)

These change request lists support filtering over many key properties for the change request to help focus reviewers or authors to the changes that matter to them. Clicking on a specific change in the change request list opens a larger view for that change request. This change request view provides information about each change in three distinct sections.

![Configuration change](/docs/resources/apollo/managing-changes/config_diff.png)

Change metadata like a title, a description if provided, and the current state of the change request is provided at the top of the page.

Change requests have several potential statuses, which can be filtered for in all change request lists.

* **Approved:** The change has satisfied all compliance and other reviewer requirements and has been applied.
* **Pending Approvals:** One or more approvers must still submit a review for this change.
* **Rejected:** The change was rejected by one of the reviewers and must be edited to re-submit for approver review.
* **Cancelled:** The change was cancelled by its author.
* **Error:** The change failed some automated validation and the author should take action based on the surfaced error message.

![Request status](/docs/resources/apollo/managing-changes/request_status.png)

Change details are below the change metadata. This shows the specific contents of the change, and the change details displayed may depend on the **Change Type** described later in this section.

Changes always include a link back to the context where the change was proposed and enough information for reviewers to understand what changed.

![Configuration change](/docs/resources/apollo/managing-changes/config_change.png)

On the right there is key information about the reviewers required for this change request. The Environment, Installation, or other Entity owning Team are typically required as reviewers.

Each user who has approved a change request may count for one or more required review policies. A green check mark in the Team **Requested Reviewers** section will help display when a review requirement has been satisfied. Clicking on a Team requested for review will display Team contact details and link to the Team members page to help identify required reviewers.

Labels can also be applied to help categorize and search for change requests. There is one special label `Do not merge` that can be used to delay change rollout even if all review requirements are satisfied.

![Approval](/docs/resources/apollo/managing-changes/approval.png)
