---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c9254cd9619e19609cf4af98ef46947330e5ba83087dbaa31609db15b56584b6"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Build transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Build transforms

The Palantir extension for Visual Studio Code lets you build directly from your editor. After [previewing](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview/) and [debugging](/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms/) your transforms, building is the final step before running your code on the full production dataset. Builds execute on the Palantir platform, and you can monitor their progress, view logs, and manage them without leaving your VS Code environment.

## Build vs. preview

* **Use preview** when developing and testing transform logic with sample data or specific data subsets.
* **Use build** when you are ready to run your transform on the full production dataset and commit changes to your pipeline.

## How to initiate a build

You can start a build within your local VS Code environment or an in-platform VS Code workspace in three ways:

### Method 1: Command Palette

Select the **Palantir: Build on Foundry** option from the Command Palette.

![The Palantir: Build on Foundry option in the VS Code Command Palette.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/palantir-build-command.png)

### Method 2: Palantir side panel

Select the **Build** icon from the Palantir side panel.

### Method 3: Build panel

Open the **Build** panel and select the **Build** option.

![The Build option from within the Build panel in VS Code.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/build-button-panel.png)

## Understand the build process

You can initiate a build for any file from an open Palantir repository.

:::callout{theme="neutral"}
To build a file, you must push all local changes back to the remote repository.
:::

Once your local branch is synchronized with the remote branch, the build process will execute necessary checks and run the build on the Palantir platform with the full dataset.

Navigate to the **Builds** panel to view build status, access logs, and monitor your output datasets.

![The Build panel in Visual Studio Code.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/build-panel.png)
