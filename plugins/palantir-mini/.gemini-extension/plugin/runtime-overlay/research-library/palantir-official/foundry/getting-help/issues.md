---
sourceUrl: "https://www.palantir.com/docs/foundry/getting-help/issues/"
canonicalUrl: "https://palantir.com/docs/foundry/getting-help/issues/"
sourceLastmod: "2026-05-12T17:06:26.146Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e08e2949491aa8068214582a5d281b1831f1a1702975b0e42c67df7dc266f5be"
product: "foundry"
docsArea: "getting-help"
locale: "en"
upstreamTitle: "Documentation | Getting help > Issues application"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Issues application

The Issues application is a support system that enables users to get help from within the Palantir platform.

Using the Issues application, you can:

* Ask questions about applications or the platform itself.
* Triage and resolve problems, requests, and questions transparently.
* Report problems on resources from anywhere inside the platform and see which resources have unresolved issues.
* Make requests for integrating more data within the platform.

![Issues application overview interface](/docs/resources/foundry/getting-help/issues-app.png)

## Access the Issues application

From the platform home page:

1. On the left navigation bar, select **View all** located to the right of the **Platform Apps** section.
2. Select **Issues** from under **Support**.

<img src="./media/issues-access.png" alt="Issues application access from the left navigation bar" width="250">

## Search for issues

From the Issues home page, you can filter and search for specific issues to narrow down to issues of interest. By default, you'll see the **Open** issues overview page. You may also select **Closed** or **All** to see the respective view.

1. Sidebar filtering: The sidebar on the left offers options to filter by:

   * Priority
   * Assignees
   * Reporters
   * Mentions
   * Labels
   * Due date
   * Reported on date
   * Last updated date

2. Search issues: This search bar allows you to search through all the user-entered fields, including the **Title** and **Comments**.

3. Select Filters: The select filter option allows you to filter by issues that are related to you (for instance, issues assigned to you, reported by you, or mentioning you). There are multiple ways to sort the issues displayed in the Issues application, including:
   * Best match
   * Most recently updated (default)
   * Least recently updated
   * Recently created
   * Oldest created
   * Highest priority
   * Lowest priority
   * Earliest due date
   * Latest due date

## Report an issue

To report an issue, navigate to the **Support** section in your Workspace sidebar and select either **Report issue** or **Contact support**. View existing issues by selecting **View support tickets**.

Once your issue is created, you will be brought back to the **Issues** overview page where recent issues are listed, which will be reviewed by the relevant assignees. Select it to enter the issue-specific page and add a comment to provide further updates, or edit its status, priority, due date, assignee, inquiry type, (related) application, or label. Otherwise, select **Close issue** if a resolution has been reached.

<img src="./media/issues-new-issue.png" alt="Advanced details prompt in Report an issue" width="800">

<img src="./media/issues-open-issue.png" alt="Advanced details prompt in Report an issue" width="800">

Depending on the configuration of your enrollment, you will then go through one of the two issue filing flows when creating an issue. View [default flow](#default-flow) or [simplified flow](#simplified-flow) instructions below.

### Default flow

1. Select the appropriate category of help.

<img src="./media/issues-file-1.png" alt="File an issue" width="800">

2. When asked for further clarification based on the category of help chosen, select from the options presented, then select **Next**.

3. Select details to share (for example, the file or object, or the relevant application), and consider whether suggested readings based on your selections could help. If you still would like to proceed with filing an issue, select **Next**.

4. Provide all details available, including a **Title**, **Description**, and any additional details such as **Priority**, **Assignees**, **Followers**, **Labels**. Then select **Create Issue**.

<img src="./media/issues-advanced-details.png" alt="Advanced details prompt in Report an issue" width="800">

* **Priority:** Select the problem priority to let the supporting team know how urgent it is.
* **Assignees:** Select individuals that should be responsible for resolving the problem. If possible, add specific individuals that may be able to assist in the resolution of the problem. Note that the Issues application may automatically suggest assignees as well. You can unselect automatically suggested assignees, but this is generally discouraged since these assignees are made based on rules configured by your Palantir platform administrator.
* **Followers:** Select individuals that may benefit from awareness about the problem resolution. Note that followers will be subscribed to all updates on the problem. Note that the Issues application may automatically add followers as well; these followers are made based on rules configured by your Palantir platform administrator.
* **Labels:** Select labels that apply to your issue. Adding accurate labels will help support teams understand your issue, what and who it affects, and how to best provide a solution. The Issues application may automatically add labels as well; these labels are added based on rules configured by your Palantir platform administrator.

:::callout{theme="neutral"}
`Feature request` type issues do not have an associated file or folder, so `Reported file location` will not be used to match on any associated issue rules.
:::

### Simplified flow

1. Select the support type that most accurately reflects your need.

<img src="./media/simplified_issues_filing_flow_types.png" alt="Select a support type." width="800">

2. Provide as much information as possible, including a **Title**, **Description**, **Priority**, and any additional details such as **Associated resources** or **Attachments** where relevant. Then, select **Create Issue**.

<img src="./media/simplified_issues_filing_flow_details.png" alt="Add additional details." width="800">

:::callout{theme="neutral"}
Unlike the default flow, the assignee can only be modified after the creation of the issue, except when the `Other` support type is chosen, in which case the reporter is responsible for selecting the appropriate user or group to address their issue.
:::

## Issue permissions

Issues will generally be accessible to all other users in your Organization. However, if an issue is related to a dataset or resource, access can be controlled with [roles](/docs/foundry/security/projects-and-roles/#roles) on the project where the dataset or resource is located. You can control whether a user can see an issue based on the filesystem permissions that user has on the dataset or resource.

**Note:** Creating an issue on a dataset or resource does not grant other users access to that dataset or resource.

### Collaboration across Organizations

Access to an issue is subject to the Organizations associated with it. By default, all issues are associated with the reporter's Organization. When assigning an issue to users or groups outside this Organization, the user updating the issue is able to add an Organization of those associated with the assignees to the issue. Assignees will only be able to view the issue if the issue is associated with an Organization to which they belong (for example, their Organization or an Organization to which they have been granted guest membership). This is also the case when re-assigning the issue.

When assigning issues to groups, there are no strict guarantees that any individual user of an assigned group will be able to view the issue. This is because individual members of the assigned group may not have access to any of the Organizations associated with the issue.

:::callout{theme="warning"}
The association of a group with an Organization does not grant all members of that group access to the Organization. This can only be done through granting guest membership to an Organization. When assigning groups to an issue, you should investigate the permissions of group members to confirm which Organizations (if any) need to be added to the issue to ensure that members have access to respond to the issue.
:::

## Comment tags

When viewing comments on an issue, you may see colored tags displayed next to the commenter's name. These tags help identify the role or relationship of the commenter to the issue, making it easier to understand who is responding and their context.

### Available tags

| Tag | Description |
|-----|-------------|
| **Assignee** | Displayed for users who are assigned to the issue, either directly or through a group assignment. |
| **Reporter** | Displayed for the user who originally created the issue. |
| **Automated** | Displayed for auto-generated comments from the system. |

### Tag display rules

* A single comment can have multiple tags if the commenter has multiple roles. For example, a user who reported an issue and is also assigned to it will see both the **Reporter** and **Assignee** tags.
* Tags are determined automatically based on the commenter's relationship to the issue and cannot be manually assigned or removed.
