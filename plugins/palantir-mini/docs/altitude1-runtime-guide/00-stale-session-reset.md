# Stage 00 — Stale-session reset

**Goal.** Never silently operate on a stale `current.json` FDE session. A real
`.palantir-mini/session/ontology-engineering-workflow/current.json` can already exist
(e.g. a June-11 "linear-function textbook" session left at phase
`semantic-contract-drafted`, `mutationAuthorized:false`). Detect it read-only first, then
either resume it deliberately or `start` a fresh one — and from then on thread the
`sessionId` explicitly so nothing falls back to that stale `current.json`.

**Call.**
- Detect (read-only): `pm_ontology_engineering_workflow` action `"status"`.
- Fresh: `pm_ontology_engineering_workflow` action `"start"`.

**Key params.**
- `projectRoot` — absolute project root (required on every OE call).
- `sessionId` — for `status`/resume, the session to read; omit on a truly fresh `start`
  to mint a new id. **MUST be threaded on every later OE call** (see Failure→fix).
- `universalOntologyEntryRef` / `universalOntologyEntryId` (`start`) — resolves the
  `UniversalOntologyEntry` the session is created from. Comes from the project's onboard/
  entry bootstrap, **not** the prompt-front-door envelope.
- `fdeSessionRef` — alternative to `sessionId` (a `ontology-engineering-workflow:<id>`
  ref); `sessionIdFromRef` unwraps it.

**Returns.**
- `status` → `state.{fdeSessionId, updatedAt, phase, mutationAuthorized}` — inspect
  `phase`/`mutationAuthorized` to decide resume-vs-fresh.
- `start` → `sessionRef` + the written `state` (carrying `fdeSessionId`).
- **Threads to Stage 01/02/03:** capture the session id (`state.fdeSessionId`, or the id
  inside `sessionRef`) and pass it as `sessionId` / `fdeOntologyEngineeringSessionRef` on
  every subsequent stage.

**Common failure → fix.**
- `pm_ontology_engineering_workflow could not resolve UniversalOntologyEntry` → no entry
  exists; run the project's onboard / entry bootstrap before `start`
  (`createOrReadSessionFromEntry` throws when `required` and `readUniversalEntry` is empty).
- Omitting `sessionId` on a later call → `readSessionByInput` silently falls back to the
  stale `current.json` (it reads `current.fdeSessionId` when no id/ref is supplied).
  **Always thread the id.**

**Source.** `bridge/handlers/pm-ontology-engineering-workflow.ts` — grep
`createOrReadSessionFromEntry`, `readSessionByInput`, `sessionIdFromRef`, and the
`case "start"` / `case "status"` arms.

next: Stage 01
