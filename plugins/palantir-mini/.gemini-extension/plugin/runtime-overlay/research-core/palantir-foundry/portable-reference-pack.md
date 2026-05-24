# Portable Palantir Reference Pack

This pack is a compact fallback for palantir-mini education and lecture
delivery work. It is not a new source of truth. It points back to local
research anchors and preserves the rule that `~/.claude/research` is read-only
provenance.

## Routing

- `BROWSE.md` answers which anchor to open first.
- `INDEX.md` lists the portable files and provenance.
- External research wins when `~/.claude/research/palantir-foundry/` is present
  and fresh.

## Summary Domains

| Domain | Summary | Lecture Delivery Kernel implication |
|---|---|---|
| AIP | Agent runtime work needs explicit tool, memory, provenance, and approval boundaries. | Presenter readiness must be backed by evidence and approval, not only generated UI state. |
| Ontology | Objects, actions, permissions, and application state should be explicit semantic surfaces. | `LectureProblem`, `SolutionStep`, `LectureSequence`, `SequencerDraft`, and `PresenterReadiness` are typed kernel nouns. |
| Context | Context is routed by small routers, not bulk-loaded into every runtime. | The kernel stores evidence refs to `solution.md`, `seq-data.json`, and `seq-frames.json` rather than copying those artifacts. |
| Function | Evaluable logic surfaces return deterministic outputs. | `ingestProblem`, `buildSequenceContext`, `createSequencerDraft`, `runPresenterReadinessCheck`, and `evaluateLectureGovernance` are pure functions. |
| Action | Mutating work needs proposal, simulation, and rollback boundaries. | `SequencerDraft` proposes edits only; v0 does not mutate generated or runtime presenter files. |
| Security | Agentic runtime security follows provenance, sandboxing, memory, and governance hooks. | Readiness fails closed when evidence, approval, or mutation boundary is missing. |
| Evals | Evaluation suites, cases, functions, and metrics make behavior comparable across versions. | The kernel ships deterministic unit coverage plus an eval-suite declaration before runtime integration. |

## Source Anchors

- `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`
- `aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md`
- `~/.claude/research/palantir-foundry/BROWSE.md`
- `~/.claude/research/palantir-foundry/ontology/BROWSE.md`
