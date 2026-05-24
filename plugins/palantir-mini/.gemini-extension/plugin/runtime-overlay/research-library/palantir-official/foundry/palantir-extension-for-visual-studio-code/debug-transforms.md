---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/debug-transforms/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3e28918fc6e4e26350d286fc46f47d747e40b6c387a59fd34a27992de1164c64"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Debug transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Debug transforms

The Palantir extension for Visual Studio Code supports inspecting variables when debugging Python transforms. Complex data structures such as DataFrames can be loaded into the extension's **Preview** panel, allowing you to verify transform accuracy and identify issues before [initializing a build](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-build/).

## Start a debug session

To use debugging features with the Palantir extension for Visual Studio Code, open a Python file containing a transform. Set at least one breakpoint in your code to pause execution when that code is executed. When the breakpoint is reached, Visual Studio Code's **Debug** panel will open automatically and display the variables currently in scope.

To start a debug session, select **Debug** above the transform.

![The "Debug" option above an example Python transform.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/transform-debug-button.png)

When a breakpoint is reached in your debugging session, you can inspect supported variables using the **Preview** panel through the following two methods:

* Select **🔎 Inspect current value of …** above the variable you wish to inspect

![The "Inspect variable" option above an example Python transform.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/transform-inspect-variable-button.png)

* Right-click on the variable in Visual Studio Code's **Debug** panel and select **Palantir: Inspect variable**.

![The "Inspect variable" option in Visual Studio Code's Debug panel.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/transform-inspect-variable-context-menu.png)

Inspecting a variable will load it into the extension's **Preview** panel. You can then view the variable's contents and use the **Preview** panel's features to explore the data, such as viewing column statistics.

![A variable being inspected through the extension's Preview panel.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/transform-inspect-variable-preview.png)
