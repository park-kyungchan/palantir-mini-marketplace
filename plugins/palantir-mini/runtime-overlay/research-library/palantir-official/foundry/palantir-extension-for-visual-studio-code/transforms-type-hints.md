---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-type-hints/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-extension-for-visual-studio-code/transforms-type-hints/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "17cf32bd26f9d81199bf53b39ce06ea78b6193ab04b8c69787c26a15c94c2432"
product: "foundry"
docsArea: "palantir-extension-for-visual-studio-code"
locale: "en"
upstreamTitle: "Documentation | Palantir extension for Visual Studio Code > Transforms type hints"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transforms type hints

The Palantir extension for Visual Studio Code includes a linter to ensure the correct usage of transform parameter types in your Python code. This linter suggests code actions to add or update transform parameter type hints, ensuring that the Python language server provides accurate code completions.

## Usage

The linter displays warnings for missing or incorrect type hints:

![The information box for the linting error.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/type_hint_hover.png)

You can fix the warnings by selecting **Quick Fix** and choosing one of the suggested code actions:

![The code actions to resolve the linting error.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/type_hint_code_actions.png)

The linter automatically inserts the required import statements and adds the correct type hints to the function parameters.

## Disable type hints

You can disable type hint suggestions globally in the settings, or use inline comments to instruct the linter to skip specific lines or files.

### Disable type hints in settings

To disable type hints, go to **Settings > Extensions > Palantir > Transforms > Language Server > Diagnostics**, and uncheck the box. This is equivalent to adding `"palantir.transforms.languageServer.diagnostics.enabled": false` to your `settings.json` file.

![Disabling transform type hints in the settings.](/docs/resources/foundry/palantir-extension-for-visual-studio-code/type_hints_settings.png)

### Disable type hints with inline comments

You can disable type hint suggestions inline by using special comments. The linter supports the following comments:

| Comment | Behavior |
| -------- | -------- |
| `# palantir: ignore` | Ignores all type hints if placed at the beginning of the file; ignores type hints for the specific line if placed elsewhere |
| `# palantir: ignore-next-line` | Ignores type hints in the next line |
| `# type: ignore` | Ignores all type hints if placed at the beginning of the file; ignores type hints for the specific line if placed elsewhere    |
| `# noqa` | Ignores type hints in the same line |
