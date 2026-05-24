---
sourceUrl: "https://www.palantir.com/docs/foundry/compass/create-a-project/"
canonicalUrl: "https://palantir.com/docs/foundry/compass/create-a-project/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c1fa65aa1463eb2fb948e52c032a9d5b22ddb8642aa671d5f8d3f074d0ea9080"
product: "foundry"
docsArea: "compass"
locale: "en"
upstreamTitle: "Documentation | Compass > Create a Project"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a Project

If you have the [appropriate permissions](/docs/foundry/security/projects-and-roles/#create-projects), you can create new Projects by navigating to the Projects landing page and selecting **+ New project** located in the upper right.

<img src="./media/new-project.png" alt="Create new project option" width="250" />

Select **Project** to open a **Create new project** pane.

<img src="./media/create-new-project.png" alt="Create new project prompt." width="300" />

Name your Project, add an optional description, and select a location ([**space**](/docs/foundry/security/orgs-and-spaces/#spaces)) where your Project will live. You can also change the default role for users within your Organization.

To set the default role that is initially selected for a particular space, go to the corresponding [**space settings**](/docs/foundry/platform-security-management/manage-orgs-and-spaces/) and change the Project default roles.

Select **Create** to enter your new Project dashboard.

## Add documentation

You can add documentation to any folder by dragging and dropping a Markdown file named `README.md` into the folder, or selecting **Add description** from the folder’s Actions menu. [Standard Markdown ↗](https://daringfireball.net/projects/markdown/syntax) is supported, with some security-related restrictions:

* Inline HTML is disabled.
* Unless otherwise configured, only image files uploaded to Foundry will be rendered. Markdown for Foundry-hosted images is as follows: `![Alt text](link to image in Foundry)`.

Links to Foundry resources are also supported. Use the following syntax to have the description automatically add links with icon and file name inferred: `[optional link text](rid)`.

:::callout{theme="neutral"}
Existing `.md` files in a Project will not automatically convert to be rendered in place, even if they are correctly named `README.md`. Downloading the existing `README.md`, deleting it from the folder, and re-uploading it will make it display.
:::
