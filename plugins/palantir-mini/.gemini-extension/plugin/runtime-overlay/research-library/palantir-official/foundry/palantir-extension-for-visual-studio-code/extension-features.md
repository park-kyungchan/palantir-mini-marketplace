---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/extension-features/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/extension-features/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "894d0a6dc1bf5d1fda65a006f5dee71ee450f90fbc856841bbcca6df92f3a9d5"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Feature list"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Feature list: Palantir extension for Visual Studio Code

This page describes the features available in the Palantir extension for Visual Studio Code.

* [Transforms preview](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview/)
  * [Active preview](/docs/foundry/palantir-extension-for-visual-studio-code/active-preview/)
  * [Code-defined input filters](/docs/foundry/palantir-extension-for-visual-studio-code/code-defined-filtering/)
* [Debug transforms](/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms/)
* [Build transforms](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build/)
* [Transforms type hints](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-type-hints/)
* [Python libraries](/docs/foundry/palantir-extension-for-visual-studio-code/python-libraries/)
  * [Debug Python environment](/docs/foundry/palantir-extension-for-visual-studio-code/environment-debugger/)

## Commands

The following sections list the commands available in the Palantir extension for Visual Studio Code. Use these commands to enhance your workflow when working with Python transforms within the Palantir ecosystem, such as during pipeline development.

If a command is not integrated within the interface, you can invoke it using the **Command Palette**. You can access the Command Palette with the `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) keyboard shortcut.

### Preview and build

#### Run preview

Executes a preview of the current transform file.

* Command: `palantir.transforms.previewFile`
* Icon: <img alt="The Run preview icon, which is a fast-forward symbol." src="./media/fast-forward.svg" width="30">

#### Build on Foundry

Initiates a build process for the selected file on Foundry.

* Command: `palantir.transforms.buildFile`
* Icon: <img alt="The Build on Foundry icon, which is a hammer symbol." src="./media/build.svg" width="30">

#### Open preview panel

Displays the preview panel for quick access to transform previews.

* Command: `palantir.transforms.openPreviewPanel`

### Transform management

#### Create new transform

Initializes a new transform project.

* Command: `palantir.transforms.createTransform`

#### Install Python environment

Sets up the Python environment necessary for developing transforms.

* Command: `palantir.transforms.initializePythonEnvironment`

#### Install Python test environment

Sets up the Python test environment for transform development.

* Command: `palantir.transforms.initializePythonTestEnvironment`

### Repository and file management

#### Open file in browser

Opens the currently selected file in a web browser.

* Command: `palantir.openFileInBrowser`

#### Open repository

Provides a quick way to access the repository in a web browser.

* Command: `palantir.openRepository`

### Accessibility

#### High contrast display

Provides a quick way to toggle between high contrast and normal themes in VS Code.

* Command: `palantir.toggleHighContrastTheme`
* Keyboard shortcut (macOS/Windows): `ctrl + option + h` / `ctrl + alt + h`

### Commands for local development only

#### Clone code repository

Allows cloning of repositories for local development.

* Command: `palantir.cloneRepository`

#### Restart Code Assist workspace

Restarts the workspace for Code Assist.

* Command: `palantir.code-assist.restartWorkspace`

#### Refresh token

Refreshes the authentication token to maintain access to Palantir services.

* Command: `palantir.refreshToken`
* Icon: <img alt="The refresh icon, which is a circle with an arrow at one end." src="./media/refresh.svg" width="30">

## Snippets

[Snippets in Visual Studio Code ↗](https://code.visualstudio.com/docs/editor/userdefinedsnippets) are templates that make it easier to enter repeating code patterns.

Below is a list of all available snippets in the Palantir extension for Visual Studio Code. The symbol **→** represents the `Tab` key.

### Long-form snippets

| Snippet                   | Output code template |
| ----------------------   | ------- |
| `python_transform→`       | A Python transform |
| `polars_transform→`       | A Python lightweight transform using Polars |
| `pandas_transform→`       | A Python lightweight transform using pandas |

### Short-form snippets

| Snippet                   | Output code template |
| ----------------------   | ------- |
| `ptf→`                    | A Python transform |
| `pltf→`                   | A Python lightweight transform using Polars |
| `pdtf→`                   | A Python lightweight transform using pandas |
