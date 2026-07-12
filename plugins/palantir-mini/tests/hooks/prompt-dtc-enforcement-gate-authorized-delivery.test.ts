/**
 * A2 authorized-delivery lane — hook-level certification (SECURITY-CRITICAL).
 *
 * Cases (task brief):
 *   (i)  an authorized 'merge the PR' user-approval envelope PASSES a pull-request
 *        delivery action (PASS-WITH-AUDIT — the gate emits its audit row).
 *   (ii) the SAME quote does NOT pass an ontology-write action (the A1 floor is
 *        never relaxed by the delivery lane).
 *  (iii) a forged / absent / quote-mismatched approval DENIES the delivery action.
 *
 * Trust anchor: the on-disk PromptEnvelope written by PromptFrontDoorStore (the
 * model can neither write nor alter it). The verifier re-loads it fail-closed.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate, {
  __test__,
} from "../../hooks/gates/prompt-dtc-enforcement-gate.impl";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
} from "../../lib/prompt-front-door";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

const SAVED_ENV_KEYS = [
  "PALANTIR_MINI_PROMPT_DTC_GATE_MODE",
  "PALANTIR_MINI_PROMPT_DTC_GATE_BYPASS",
  "PALANTIR_MINI_EVENTS_FILE",
  "PALANTIR_MINI_PROJECT",
  "PALANTIR_MINI_HOST_RUNTIME",
] as const;

const SESSION_ID = "session-a2-delivery-hook";
const RUNTIME = "claude";

/** A user prompt that co-occurs an approval verb + a delivery surface marker. */
const APPROVING_DELIVERY_PROMPT = "Go ahead and merge the PR — I approve shipping it.";

function git(dir: string, args: string): void {
  execSync(`git ${args}`, { cwd: dir, stdio: ["ignore", "ignore", "ignore"] });
}

/**
 * G-GATE-J — a fake `gh` PATH shim: writes an executable `gh` script that
 * recognizes `pr diff --name-only [selector]` and echoes a fixed path list (one
 * per line), then prepends its dir to `process.env.PATH` for the duration of
 * `fn` (restored in `finally`, independent of the SAVED_ENV_KEYS afterEach —
 * PATH is NOT in that array since deleting it would break every other test's
 * git/gh resolution). Mirrors what `allPushRangePathsNonOntology` used to
 * resolve for `makeTmpProject()` (README.md + docs.md, both non-ontology), so
 * the regression tests below exercise the SAME non-ontology change-set the
 * legacy push-range mechanism proved — only the ground-truth OBJECT changed.
 */
async function withFakeGhOnPath<T>(paths: string[], fn: () => Promise<T>): Promise<T> {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-fake-gh-"));
  tmpDirs.push(binDir);
  const script = `#!/bin/sh\n${paths.map((p) => `echo "${p}"`).join("\n")}\n`;
  const ghPath = path.join(binDir, "gh");
  fs.writeFileSync(ghPath, script, { mode: 0o755 });
  const savedPath = process.env.PATH;
  process.env.PATH = `${binDir}:${savedPath ?? ""}`;
  try {
    return await fn();
  } finally {
    process.env.PATH = savedPath;
  }
}

/**
 * A real git-backed tmp project. REGRESSION CAVEAT (6d / existing test (i)): with the
 * step-1e write-set requirement, a `gh pr merge` delivery PASS now ALSO requires
 * `allPushRangePathsNonOntology(project)` to resolve TRUE — which needs a real repo
 * with a base ref BEHIND HEAD whose `base...HEAD` range is non-empty and all-non-
 * ontology. We commit README.md as the base, point `origin/main` at it, then advance
 * HEAD with a second non-ontology commit so the range is a proven non-ontology change.
 * The ontology adversarial cases (6a/6b/6c) supply ontology WRITE-SETS via the tool
 * payload (not this range), so they still DENY.
 */
function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dtc-gate-a2-delivery-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"dtc-gate-a2-test\"}\n");

  // Real git repo with a non-ontology base ref BEHIND HEAD.
  git(dir, "init -q");
  git(dir, "config user.email a2-test@example.com");
  git(dir, "config user.name a2-test");
  git(dir, "config commit.gpgsign false");
  fs.writeFileSync(path.join(dir, "README.md"), "# base\n");
  git(dir, "add README.md");
  git(dir, 'commit -q -m base');
  // Point origin/main (the preferred base ref) at the base commit.
  git(dir, "update-ref refs/remotes/origin/main HEAD");
  // Advance HEAD with a SECOND non-ontology commit so origin/main...HEAD is a
  // non-empty, all-non-ontology range.
  fs.writeFileSync(path.join(dir, "docs.md"), "non-ontology change\n");
  git(dir, "add docs.md");
  git(dir, 'commit -q -m "non-ontology delivery change"');
  return dir;
}

/**
 * A real git-backed tmp project whose origin/main...HEAD range CONTAINS an ontology
 * surface, so a `gh pr merge` stays at the `pull-request` (BLOCKING) floor instead of
 * de-flooring to `generic-mutation`. Used by the forged/absent/negated delivery-
 * approval DENY tests, whose intent is: an INVALID delivery approval must not clear a
 * delivery action that the floor would otherwise block. (With an all-non-ontology
 * range the action de-floors to scoped-blocking, which is the regression PASS lane —
 * not what these DENY cases mean to exercise.)
 */
function makeTmpProjectOntologyRange(): string {
  const dir = makeTmpProject();
  const ontologyFile = path.join(dir, "projects", "foo", "ontology", "objecttypes", "student.ts");
  fs.mkdirSync(path.dirname(ontologyFile), { recursive: true });
  fs.writeFileSync(ontologyFile, "export const student = {};\n");
  git(dir, "add projects/foo/ontology/objecttypes/student.ts");
  git(dir, 'commit -q -m "ontology change in range"');
  return dir;
}

/** Persist a captured-only envelope whose excerpt carries a delivery approval. */
async function captureDeliveryApprovalPrompt(
  project: string,
  rawPrompt = APPROVING_DELIVERY_PROMPT,
) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt,
    sessionId: SESSION_ID,
    runtime: RUNTIME,
    projectRoot: project,
    capturedAt: "2026-06-25T04:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope); // also writes the current pointer
  return { store, envelope };
}

function deliveryPayload(
  project: string,
  envelope: { promptId: string; promptHash: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    cwd: project,
    session_id: SESSION_ID,
    tool_name: "Bash",
    tool_input: {
      command: "gh pr merge 123 --squash",
      promptId: envelope.promptId,
      promptHash: envelope.promptHash,
      sessionId: SESSION_ID,
      runtime: RUNTIME,
      userApprovalQuote: "merge the PR",
      userApprovalPromptId: envelope.promptId,
      userApprovalPromptHash: envelope.promptHash,
    },
    ...overrides,
  };
}

function readEvents(project: string): Array<{
  type: string;
  payload?: Record<string, unknown>;
}> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of SAVED_ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("prompt-dtc-enforcement-gate: A2 authorized-delivery lane", () => {
  // ── (i) authorized 'merge the PR' passes a pull-request delivery action ──────
  test("(i) authorized 'merge the PR' envelope PASSES the pull-request delivery action (pass-with-audit)", async () => {
    const project = makeTmpProject();
    // No env → floors to blocking for pull-request; the delivery lane clears it.
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    // G-GATE-J: `gh pr merge` now proves its change-set via `gh pr diff`, not the
    // local push range — shim `gh` to return the SAME non-ontology paths the
    // legacy push-range mechanism used to resolve for this fixture.
    const result = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project, envelope)),
    );

    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate OK");

    // PASS-WITH-AUDIT: the gate assessment event must still have fired.
    const auditEvent = readEvents(project).find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload?.errorClass === "prompt_dtc_gate_passed" &&
        e.payload?.userApprovalAuthorized === true,
    );
    expect(auditEvent).toBeDefined();
  });

  // ── (ii) the SAME quote does NOT pass an ontology-write action ───────────────
  test("(ii) the SAME 'merge the PR' quote does NOT pass an ontology-write action (A1 floor intact)", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    // apply_edit_function classifies as ontology-write; the delivery lane is scoped
    // to NEVER fire for ontology-write, so the gate must still BLOCK (no SIC/DTC).
    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
      tool_input: {
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        userApprovalQuote: "merge the PR",
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
      },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
  });

  // ── (iii) forged / absent / mismatched quote DENIES ─────────────────────────
  // These use an ONTOLOGY-range git project so `gh pr merge` stays at the
  // `pull-request` BLOCKING floor: the point is that an INVALID delivery approval
  // does not clear a delivery action the floor would otherwise block.
  test("(iii-a) a forged quote (never in the captured prompt) DENIES the delivery action", async () => {
    const project = makeTmpProjectOntologyRange();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await promptDtcEnforcementGate(
      deliveryPayload(project, envelope, {
        tool_input: {
          command: "gh pr merge 123 --squash",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: SESSION_ID,
          runtime: RUNTIME,
          // approval verb + delivery marker, but the user NEVER said this.
          userApprovalQuote: "I approve merging the production hotfix now",
          userApprovalPromptId: envelope.promptId,
          userApprovalPromptHash: envelope.promptHash,
        },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });

  test("(iii-b) an ABSENT quote (no userApproval* inputs) DENIES — legacy SIC/DTC required", async () => {
    const project = makeTmpProjectOntologyRange();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "Bash",
      tool_input: {
        command: "gh pr merge 123 --squash",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        // no userApprovalQuote / userApprovalPromptId / userApprovalPromptHash.
      },
    });

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
    // The delivery-class blocker carries the authorize-delivery instruction
    // (not the dead generic MODE=off line as the sole escape).
    expect(result.reason).toContain("Authorize delivery");
  });

  test("(iii-c) a NEGATED captured prompt cannot be cleared even with a substring quote", async () => {
    const project = makeTmpProjectOntologyRange();
    const { envelope } = await captureDeliveryApprovalPrompt(
      project,
      "Please don't merge the PR yet.",
    );

    const result = await promptDtcEnforcementGate(
      deliveryPayload(project, envelope, {
        tool_input: {
          command: "gh pr merge 123 --squash",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: SESSION_ID,
          runtime: RUNTIME,
          userApprovalQuote: "don't merge the PR", // genuine substring, but negated
          userApprovalPromptId: envelope.promptId,
          userApprovalPromptHash: envelope.promptHash,
        },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// A2 ontology-write bypass — fail-closed (SECURITY-CRITICAL).
//
// Every case below supplies a VALID captured "merge the PR" delivery approval (all
// userApproval* fields verify against the on-disk envelope), yet the operation is an
// ONTOLOGY write that de-floors to `commit`/`generic-mutation` (NOT `ontology-write`).
// Before the isProvenNonOntologyDelivery guard, class membership alone granted the A2
// PASS and these slipped through. The guard now re-proves non-ontology via the
// classifier + the resolved write-set, so each must DENY despite the valid approval.
// ───────────────────────────────────────────────────────────────────────────
describe("A2 ontology-write bypass — fail-closed", () => {
  // 6a. commit_edits w/ ontology edits + valid approval → DENIED.
  test("6a commit_edits over an ontology path DENIES even with a valid 'merge the PR' approval", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      tool_input: {
        edits: [
          {
            file_path: "projects/foo/ontology/objecttypes/student.ts",
            old_string: "a",
            new_string: "b",
          },
        ],
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        userApprovalQuote: "merge the PR",
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
      },
    });

    // commit_edits classifies isOntologyAffecting=true → guard (b)/(d) reject.
    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("BLOCKING");
  });

  // 6b. Edit on projects/*/ontology/*.ts + valid approval → DENIED.
  test("6b Edit on an ontology path DENIES even with a valid 'merge the PR' approval (blocking mode)", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    // Edit → generic-mutation (path-blind classifier); the gate's de-floor would map a
    // proven non-ontology Edit to generic-mutation. Force a deterministic hard DENY
    // (vs scoped advisory) with blocking mode; the point is that even in blocking mode
    // WITH a valid delivery approval, an ontology Edit must NOT A2-pass.
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "Edit",
      tool_input: {
        file_path: "projects/foo/ontology/objecttypes/student.ts",
        old_string: "a",
        new_string: "b",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        userApprovalQuote: "merge the PR",
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
      },
    });

    // collectTargetFiles → the ontology path → isNonOntologyPath=false → guard (e)
    // rejects → no A2 pass → falls through to digital_twin_contract_required → DENY.
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });

  // 6c. pm_intent_router cross-cutting ontology dispatch + valid approval → DENIED.
  test("6c pm_intent_router cross-cutting ontology dispatch DENIES even with a valid approval (blocking mode)", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "mcp__plugin_palantir-mini_palantir-mini__pm_intent_router",
      tool_input: {
        complexityHint: "cross-cutting",
        intent: "rewrite the objecttype ontology schema",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        userApprovalQuote: "merge the PR",
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
      },
    });

    // isCrossCuttingIntentRouter=true → guard (c) rejects → no A2 pass → DENY.
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });

  // 6d. REGRESSION — a genuine all-non-ontology PR merge still PASSES-WITH-AUDIT.
  test("6d a genuine non-ontology 'gh pr merge' still PASSES-WITH-AUDIT (regression)", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    // G-GATE-J: shim `gh pr diff` to return the PR's non-ontology change-set (the
    // change-set ground truth for an existing-PR subcommand like `merge`).
    const result = await withFakeGhOnPath(["README.md", "docs.md"], () =>
      promptDtcEnforcementGate(deliveryPayload(project, envelope)),
    );

    // `gh pr diff` resolves a non-empty, all-non-ontology change-set → guard (e)
    // proves it → A2 PASS-WITH-AUDIT.
    expect(result.decision).toBeUndefined();
    expect(result.message).toBe("palantir-mini: prompt-DTC gate OK");

    const auditEvent = readEvents(project).find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload?.errorClass === "prompt_dtc_gate_passed" &&
        e.payload?.userApprovalAuthorized === true,
    );
    expect(auditEvent).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// A2 ontology-PATH-CLASS bypass — path-predicate unification (SECURITY-CRITICAL).
//
// The A2 write-set screen keyed off `isNonOntologyPath`/`scopedBlockingFileReason`,
// whose only project-ontology rule was the CASE-SENSITIVE single-dir regex
// `/^projects\/[^/]+\/ontology\//`. The CANONICAL predicate (pathIsProjectOntologyClass)
// lowercases + matches the full ontology-class family — object-type(s)/, link-type(s)/,
// action-type(s)/, interface-type(s)/, shared-propert(y|ies)/, plus any-case ontology/.
// So `projects/<p>/object-types/x.ts`, the `-types/` siblings, `shared-properties/`, and
// the case-variant `…/ONTOLOGY/…` were treated as NON-ontology → A2-eligible → an
// ontology write could be A2-passed with a valid "merge the PR" approval. Each case below
// supplies a VALID captured "merge the PR" delivery approval yet writes/stages an
// ontology-CLASS path; each must DENY. (These FAIL before the unification, PASS after.)
// ───────────────────────────────────────────────────────────────────────────
describe("A2 ontology-path-class bypass — fail-closed (predicate unification)", () => {
  // Each vector is a project-ontology-class path the NARROW gate rule missed but the
  // canonical predicate catches. The case-variant ONTOLOGY/ exercises case-insensitivity.
  const ONTOLOGY_CLASS_VECTORS: Array<{ label: string; rel: string }> = [
    { label: "object-types", rel: "projects/foo/object-types/student.ts" },
    { label: "link-types", rel: "projects/foo/link-types/enrolment.ts" },
    { label: "action-types", rel: "projects/foo/action-types/promote.ts" },
    { label: "interface-types", rel: "projects/foo/interface-types/person.ts" },
    { label: "shared-properties", rel: "projects/foo/shared-properties/name.ts" },
    { label: "ONTOLOGY case-variant", rel: "projects/foo/ONTOLOGY/student.ts" },
  ];

  for (const { label, rel } of ONTOLOGY_CLASS_VECTORS) {
    // 6e.* — Edit on an ontology-CLASS path + valid approval → DENIED.
    test(`6e Edit on ontology-class path (${label}) DENIES even with a valid 'merge the PR' approval`, async () => {
      const project = makeTmpProject();
      const { envelope } = await captureDeliveryApprovalPrompt(project);

      // Force a deterministic hard DENY (vs scoped advisory) with blocking mode; the
      // point is that even in blocking mode WITH a valid delivery approval, an ontology-
      // class Edit must NOT A2-pass. collectTargetFiles → this path → isNonOntologyPath
      // is now false (canonical predicate) → A2 guard (e) rejects → DENY.
      process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "blocking";

      const result = await promptDtcEnforcementGate({
        cwd: project,
        session_id: SESSION_ID,
        tool_name: "Edit",
        tool_input: {
          file_path: rel,
          old_string: "a",
          new_string: "b",
          promptId: envelope.promptId,
          promptHash: envelope.promptHash,
          sessionId: SESSION_ID,
          runtime: RUNTIME,
          userApprovalQuote: "merge the PR",
          userApprovalPromptId: envelope.promptId,
          userApprovalPromptHash: envelope.promptHash,
        },
      });

      expect(result.decision).toBe("block");
      expect(result.reason).toContain("BLOCKING");
    });
  }

  // 6f. git commit with an ontology-class path STAGED + valid approval → DENIED.
  // Closes the git commit/push lane: allStagedPathsNonOntology shares isNonOntologyPath,
  // so the staged object-types/ path must keep the commit at its BLOCKING floor.
  test("6f git commit with a STAGED ontology-class (object-types) path DENIES even with a valid 'merge the PR' approval", async () => {
    const project = makeTmpProject();
    const { envelope } = await captureDeliveryApprovalPrompt(project);

    // Stage an ontology-class path the narrow rule missed.
    const ontologyFile = path.join(project, "projects", "foo", "object-types", "student.ts");
    fs.mkdirSync(path.dirname(ontologyFile), { recursive: true });
    fs.writeFileSync(ontologyFile, "export const student = {};\n");
    git(project, "add projects/foo/object-types/student.ts");

    const result = await promptDtcEnforcementGate({
      cwd: project,
      session_id: SESSION_ID,
      tool_name: "Bash",
      tool_input: {
        command: "git commit -m ship",
        promptId: envelope.promptId,
        promptHash: envelope.promptHash,
        sessionId: SESSION_ID,
        runtime: RUNTIME,
        userApprovalQuote: "merge the PR",
        userApprovalPromptId: envelope.promptId,
        userApprovalPromptHash: envelope.promptHash,
      },
    });

    // allStagedPathsNonOntology(project) → false (object-types/ is ontology) → commit
    // stays at the `commit` BLOCKING floor → guard (e) rejects → DENY.
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("BLOCKING");
  });

  // 6g. REGRESSION — genuine non-ontology Edit paths still PASS the write-set screen.
  // (Edit de-floors to generic-mutation / scoped advisory; the A2 write-set predicate
  // must still treat these as non-ontology so legitimate delivery is not over-blocked.)
  for (const rel of ["projects/foo/src/foo.ts", "lib/bar.ts", "README.md"]) {
    test(`6g regression: genuine non-ontology path (${rel}) is NOT screened as ontology by the A2 write-set predicate`, () => {
      const project = makeTmpProject();
      // Direct unit assertion on the shared predicate (the A2 write-set screen, the
      // staged/push-range de-floors, and the advisory all key off this): genuine
      // non-ontology paths must remain non-ontology after the unification.
      expect(__test__.isNonOntologyPath(rel, project)).toBe(true);
      expect(__test__.scopedBlockingFileReason(rel, project)).toBeUndefined();
    });
  }
});
