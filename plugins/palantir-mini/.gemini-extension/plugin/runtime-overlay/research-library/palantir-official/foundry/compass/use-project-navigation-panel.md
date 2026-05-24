---
sourceUrl: "https://www.palantir.com/docs/foundry/compass/use-project-navigation-panel/"
canonicalUrl: "https://palantir.com/docs/foundry/compass/use-project-navigation-panel/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1a230eb4332fc1f1821fe1f4a77c840a4808e22f1d7b2763c13c079f22cb13bb"
product: "foundry"
docsArea: "compass"
locale: "en"
upstreamTitle: "Documentation | Compass > Use Project navigation panel"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use Project navigation panel

The Project navigation panel includes **Preview** and **Project workspace** sections which provide tools for documentation and managing lists of files.

<img src="./media/project-navigation.png" alt="Project navigation sidebar." width="200">

## Cover page

The **Cover page** section provides a Markdown-based rich-text editor to write documentation for the Project. For more information, see the [cover pages](/docs/foundry/security/cover-pages/) documentation.

## Files

The **Files** tab displays a collection of all files within a Project. The most important files in the project will appear in the pinned section at the top of this panel.

## Autosaved

When you create a new file from an existing one, it is automatically saved in the Project's **Autosaved** section instead of in **Your files**. These files are marked by the `Autosaved` label and are visible by anyone who has access to the folder or Project. Autosaved files allow for quick work and reduce Project clutter.

![A view of files which were autosaved.](/docs/resources/foundry/compass/autosaved.png)

When the files are manually saved, they will appear in the **Files** section.

### File permissions

When you create an autosaved file, it inherits the permissions of the folder where it was originally created. The user who created the autosaved file is the file Owner.

:::callout{theme="neutral"}
You need to manually save an autosaved file before sharing it with other users.

Contact your Palantir representative to help configure autosave access.
:::

## References

As Projects define both a conceptual boundary around related work and a security boundary for applying and managing access, the flow of data requires special attention.

Project **References** allow you to manage the flow of data and packages across Project boundaries and is split up into 2 sections: **File references** and **External references**.

**File references** include any file from outside the Project that is used in the Project in [Code Repositories](/docs/foundry/code-repositories/overview/), [Code Workbook](/docs/foundry/code-workbook/overview/), [Pipeline Builder](/docs/foundry/pipeline-builder/overview/), [Fusion](/docs/foundry/fusion/overview/), or [Contour](/docs/foundry/contour/overview/). Users with the `Editor` role can add file references to a Project. File references can be removed by right-clicking on the file and selecting **Remove References**. Learn more about why [file references](/docs/foundry/security/projects-and-roles/#references) are necessary.

**External references** are generally code packages automatically added to the project from various data analysis applications in order to run builds.

![File references view in the Projects tab.](/docs/resources/foundry/compass/references.png)

## Trash

Each Project has its own **Trash** section. If you no longer need a file for your Project, you can delete the file by moving the file to the Trash. Select the file you want to delete, then select the Trash icon to **Move to trash**.

![Move to trash icon highlights at the upper right of the window.](/docs/resources/foundry/compass/move-to-trash.png)

You can restore files from the Trash if you change your mind. In the Trash tab, select the file and then the **Restore** icon.

![Right click an item to use the Restore from trash option.](/docs/resources/foundry/compass/restore-trash.png)

Restoring a file places it where it was before you deleted it and returns previous permissions.

Use the **X** button to permanently delete the selected file.

## Project usage

For users with the `Owner` role on a project, a link to view [**Project usage**](/docs/foundry/resource-management/project-usage/) in [**Resource Management**](/docs/foundry/resource-management/overview/) is available at the bottom of the navigation panel.

![Project usage link in navigation panel.](/docs/resources/foundry/compass/project-navigation-with-project-usage-link.png)

## Access graph

Access graph is a tool which allows you to visualize the security setup of a project. Use it to see the markings on the project, the groups who have a role on this project, and the users who are members of those groups. Access graph can be very helpful if your setup involves a lot of nested groups.
