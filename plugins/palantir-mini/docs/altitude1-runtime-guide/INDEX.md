# INDEX — Altitude-1 runtime guide

Full file list. Route via [BROWSE.md](./BROWSE.md); read ONE slice, then act.

| File | One-line description |
|------|----------------------|
| [README.md](./README.md) | Identity + when-to-use + the 8-stage ladder + pointer-not-copy / verify-against-disk note. |
| [BROWSE.md](./BROWSE.md) | The symptom/stage → slice router (entry mode a = what I'm about to do; b = exact blocker string). |
| [INDEX.md](./INDEX.md) | This file — the full file list. |
| [00-stale-session-reset.md](./00-stale-session-reset.md) | Detect + reset a stale OE `current.json` session before any OE call; capture & thread `sessionId`. |
| [01-fde-provenance.md](./01-fde-provenance.md) | Why the gate bounces ontology-flavored intents to `contract_required`, and how to clear it. |
| [02-nine-axis-sic-fill.md](./02-nine-axis-sic-fill.md) | Fill the 9-axis SIC turn-by-turn, every step `source:"user"`; thread `fillResult.contract` back. |
| [03-approve-sic.md](./03-approve-sic.md) | The MINT seam: `approve_sic` stamps `status:"approved"` + `approvalRef` on the filled SIC. |
| [04-approve-technology.md](./04-approve-technology.md) | Conditional: clear an open TECHNOLOGY required-user-decision before the DTC validates. |
| [05-dtc-fill.md](./05-dtc-fill.md) | Build a complete `digital-twin-change/v2` turn-by-turn from the approved SIC; last turn grades. |
| [06-envelope-advance.md](./06-envelope-advance.md) | Flip the PROMPT ENVELOPE to `digital_twin_approved` (separate store from OE `current.json`). |
| [07-dispatch.md](./07-dispatch.md) | Dispatch the build via native subagent; why the router readiness gate is N/A here. |
| [08-cross-session-minted-snapshot-resume.md](./08-cross-session-minted-snapshot-resume.md) | Resume class: resolve a minted approved-SIC snapshot BY-REF when you resume the flow in a different session (bd-011). |
| [99-failure-fix-table.md](./99-failure-fix-table.md) | Consolidated blocker-string → fix table across all 8 stages (one-stop triage). |
| [_SOURCES.md](./_SOURCES.md) | Pointer index: every live source the guide cites — path + grep anchor + what it defines. |
