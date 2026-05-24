# Lead Feedback Review Card Template

Use this when the artifact can remain Markdown. If the review needs comparison,
interaction, or export controls, use `hitl-artifact-brief.md` and produce HTML.

````markdown
# HITL Review Card

Stage:
Prompt ref:
Runtime:

## Lead Inference

I think the user wants:

## Evidence

| Claim | Evidence ref | Confidence | Gap |
|---|---|---|---|

## What Will Change If Approved

- Meaning:
- Boundary:
- Runtime surface:
- Eval/lineage:

## What Will Not Change

-

## User Choices

- Approve:
- Revise:
- Cancel:
- Hold before mutation:

## Runtime Gaps

-

## Next Allowed Action

-

## Copy Prompt

```text
Use this user feedback as the next approved HITL input:
...
```
````
