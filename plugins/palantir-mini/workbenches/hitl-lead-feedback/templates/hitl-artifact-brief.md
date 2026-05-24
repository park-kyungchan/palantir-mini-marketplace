# HITL Artifact Brief Template

Use this brief to ask an agent to create a self-contained HTML artifact only
after the user explicitly requested HTML or an interactive artifact.

```text
Create a self-contained HTML Human-in-the-Loop review artifact.

Request gate:
- explicit HTML request:
- html request signal:
- selected pattern:
- source readiness:

Stage:
Audience:
Input refs:
Runtime:

Lead inference:

Evidence to show:

Decisions the user must make:

Allowed user choices:
- approve
- revise
- cancel
- hold

State effect if approved:

Next allowed actions:

Runtime gaps to display:

Export format:
- copy as prompt
- copy as markdown
- copy as JSON

Constraints:
- no network dependencies
- no remote scripts
- no hidden mutation
- no HTML without explicit user request
- no blocked source as passing evidence
- selected pattern and source refs in metadata
- user-facing language first
- raw contract refs second
```
