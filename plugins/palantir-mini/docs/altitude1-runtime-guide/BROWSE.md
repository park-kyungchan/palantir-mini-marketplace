# BROWSE — symptom/stage → slice router

Read **ONE** slice (or [99-failure-fix-table.md](./99-failure-fix-table.md)), act, then stop.
Do **not** load the whole guide. Verify every pointer against disk before acting (the disk wins).

## Entry mode (a): "what I'm about to do" → stage slice

| About to… | Slice |
|-----------|-------|
| Make sure I'm not on a stale OE session before anything | [00 stale-session-reset](./00-stale-session-reset.md) |
| Understand why an ontology intent bounces to `contract_required` | [01 fde-provenance](./01-fde-provenance.md) |
| Fill the 9-axis SIC turn-by-turn (user-sourced) | [02 nine-axis-sic-fill](./02-nine-axis-sic-fill.md) |
| Approve / mint the filled SIC | [03 approve-sic](./03-approve-sic.md) |
| Clear an open TECHNOLOGY decision (conditional) | [04 approve-technology](./04-approve-technology.md) |
| Build the DTC turn-by-turn from the approved SIC | [05 dtc-fill](./05-dtc-fill.md) |
| Advance the prompt envelope to `digital_twin_approved` | [06 envelope-advance](./06-envelope-advance.md) |
| Dispatch the build (native subagent) | [07 dispatch](./07-dispatch.md) |
| Resume an approved-SIC flow in a DIFFERENT session than minted it | [08 cross-session-minted-snapshot-resume](./08-cross-session-minted-snapshot-resume.md) |

## Entry mode (b): "the exact blocker string I just hit" → slice that fixes it

| Blocker string / symptom | Go to |
|--------------------------|-------|
| "no SemanticIntentContract ref" / "Call pm_semantic_intent_gate before mutating" | you are pre-SIC: Stage 00 (start) → 02 (fill) → 03 (approve) |
| "contract_required" + FDE provenance bounce | Stage 01 (+ Stage 00 start) |
| "unconfirmedAxes" / axes AI-sourced | Stage 02 (turnUserInput per axis) |
| `issues:[{field:"fillSequence"}]` (empty-fillSequence refusal) | Stage 02/03 (thread `fillResult.contract` back; do not pass a session-reconstructed SIC) |
| "requires approved SIC and DTC workflow state" / "mutationAuthorized=true required" | Stage 05 (DTC) then Stage 06 (envelope advance) |
| Gate still "no SIC ref" AFTER approve_sic succeeded | Stage 06 (workflow state != prompt envelope; pass both approved OBJECTS inline) |
| PreToolUse "not digital_twin_approved" | Stage 06 |
| operating on a stale `<old-date>` session / unexpected mission | Stage 00 (status + start; thread sessionId) |
| Gate says `no SIC ref` in a session that did NOT mint the SIC (approve_sic succeeded earlier) | Stage 08 (cross-session by-ref resolve; thread sessionId if ≥2 distinct minted SICs) |

For the consolidated version of mode (b) with one-line fixes, read
[99-failure-fix-table.md](./99-failure-fix-table.md) instead of any single slice.

See [INDEX.md](./INDEX.md) for the full file list and [_SOURCES.md](./_SOURCES.md) for live sources.
