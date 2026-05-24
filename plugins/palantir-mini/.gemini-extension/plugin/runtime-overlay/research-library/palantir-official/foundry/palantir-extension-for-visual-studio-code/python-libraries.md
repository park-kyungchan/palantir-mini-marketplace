---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/python-libraries/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/python-libraries/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7d9afbe2e8f505cf5c9d28e52c4babc15a59ca0157853323a69ca217b4c16cfb"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Python libraries"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Python libraries

The Palantir extension for Visual Studio Code contains a library panel that allows you to manage the Python libraries inside your Project.
You can search for libraries and install different versions.

![Visual Studio Code library panel.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/libraries-panel.png)

When you install a library, the extension automatically adds the dependency to the [meta.yaml](/docs/foundry/transforms-python/project-structure/#metayaml) file and updates the Python environment.

## Project imports

When you try to install a library from a backing repository that is not imported into your project, you will be prompted to add that backing repository and you must choose **Yes** to continue.

![Backing repository import.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/import-backing-repo.png)
