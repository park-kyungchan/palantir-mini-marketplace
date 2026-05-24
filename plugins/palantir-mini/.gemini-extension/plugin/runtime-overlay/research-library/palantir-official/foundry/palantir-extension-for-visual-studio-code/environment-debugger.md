---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/environment-debugger/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/environment-debugger/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "637121462e917ea70d487b766b2c0266712fa07a8796a511594ae944320eaf8f"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Environment debugger"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Debug the Python environment

The environment debugger helps with understanding dependencies in Python transforms environments in VS Code. When a dependency installation fails, the environment debugger displays conflicts and reveals the underlying issue, allowing the conflict to be actioned immediately. In cases where an installation succeeds, the environment debugger allows users to understand the transitive dependencies that brought a given package into the environment.

## Visualize conflicts

When encountering a solve conflict, the **Resolve in environment debugger** option will be displayed. This is triggered by the following:

* Installing a dependency using the library panel.
* Starting a preview in an unsolvable environment.

![The "Resolve in environment debugger" option displayed after a solve conflict.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/environment-debugger-conflict-button.png)

Selecting this option opens a new tab in VS Code with an interactive graph visualizing environment conflicts.

![The graph representing the conflict shown in the environment debugger.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/environment-debugger-conflict-graph-numpy.png)

Note the following graph features:

* The graph's root is the user library.
* Nodes in the graph correspond to package version requirements. Requirements are connected to the requirements that they depend on.
* Conflicting package requirements are highlighted in red. These emphasize the conflict's underlying problem.
* Packages coming from your library are marked as `user-defined`. User-defined packages will display available actions; removing a dependency or changing the version. This enables conflict resolution without leaving the environment debugger.

![The actions available for user-defined imports in the environment debugger.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/environment-debugger-conflict-actions.png)

## Visualize dependency origin

When a Python environment is resolved successfully, the environment debugger can help trace package origins and understand which dependencies caused them to be added to the environment. To view packages, open the `hawk` lockfile in the `.maestro` folder. You can then select a package, which will display the **View \[package name] in environment debugger** option above the package. Select this option to open the environment debugger.

![The "View in environment debugger" CodeLens hint above a package in the hawk lockfile.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/environment-debugger-lockfile-codelens.png)

The environment debugger contains a graph displaying the relationship between the selected package and the packages that import it. All transitive paths that cause this package to be required are shown, with their respective versions. This helps trace the origin of the selected package, enabling users to visualize the imports that depend on the selected package and version.

![The environment graph in the environment debugger showing how numpy is brought into the environment.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/environment-debugger-why-numpy.png)
