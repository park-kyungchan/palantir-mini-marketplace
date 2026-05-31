# Deletion Readiness Gate

PR8 does not treat source-complete replacement as permission to delete legacy
surfaces. Physical deletion is allowed only after all of the following are true:

- the surface has explicit metadata/profile status authorizing retirement;
- replacement evidence exists in source authority;
- no non-evidence references remain in code, tests, skills, hooks, workbenches,
  docs, or managed settings;
- Codex runtime activation evidence proves reinstall/reload and process restart
  smoke, not just source-level tests.

The gate lives in:

- `bridge/handlers/pm-plugin-self-check/check-deletion-readiness.ts`
- `scripts/verify-deletion-readiness.ts`

Current result: no physical deletion is authorized. Existing candidates are
blocked by one or more of:

- `keep` or `register` metadata status;
- remaining live or test references;
- source-only runtime evidence, with active Codex reinstall/restart smoke still
  required before active-runtime claims can be made.

This preserves the PR8 boundary: source-complete is not active-runtime-complete,
and runtime cache payloads are never source authority.
