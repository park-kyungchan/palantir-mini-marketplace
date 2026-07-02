# palantir-mini private marketplace

Private Codex marketplace for palantir-mini.

Runtime-neutral local source for this machine lives at
`~/palantir-mini-marketplace`. The upstream source of truth is
this GitHub repository, with plugin implementation under `plugins/palantir-mini/`.
Current local install support is Codex-only; Claude and Gemini install/package
surfaces are intentionally absent from this checkout until they are installed
from their own marketplace paths later. Installed cache payloads under runtime
homes are not semantic forks. See
`plugins/palantir-mini/docs/RUNTIME_LAYER_BOUNDARY.md` before editing
palantir-mini itself.

```bash
# Local Codex install from the runtime-neutral checkout:
codex plugin marketplace add ~/palantir-mini-marketplace
codex plugin add palantir-mini@palantir-mini-marketplace

# Post-merge install from GitHub:
codex plugin marketplace add park-kyungchan/palantir-mini-marketplace --ref main
codex plugin add palantir-mini@palantir-mini-marketplace
```
