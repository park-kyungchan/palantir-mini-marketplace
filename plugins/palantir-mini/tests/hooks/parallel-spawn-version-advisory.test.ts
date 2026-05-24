// palantir-mini — parallel-spawn-version-advisory hook tests (sprint-135)
//
// 5 test cases per spec:
// 1. Single spawn (no prior Agent within 60s) → no advisory
// 2. Two spawns within 60s, both carry "Pre-assigned plugin version:" → no advisory
// 3. Two spawns within 60s, neither carries slot reservation → advisory emitted
// 4. Two spawns within 60s, only one carries reservation → advisory for the one missing
// 5. Bypass envvar PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS=1 → no advisory regardless

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import parallelSpawnVersionAdvisory from "../../hooks/parallel-spawn-version-advisory";

let savedBypass: string | undefined;

beforeEach(() => {
  savedBypass = process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS;
  delete process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS;
});

afterEach(() => {
  if (savedBypass !== undefined) {
    process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS = savedBypass;
  } else {
    delete process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS;
  }
});

// We use distinct session IDs per describe to avoid cross-test spawn window pollution.
let sessionCounter = 0;
function freshSession(): string {
  return `test-session-${Date.now()}-${++sessionCounter}`;
}

function makeAgentPayload(
  prompt: string,
  sessionId: string,
  subagentType = "implementer"
): unknown {
  return {
    cwd: "/tmp",
    session_id: sessionId,
    tool_name: "Agent",
    tool_input: {
      prompt,
      subagent_type: subagentType,
      description: "test spawn",
    },
  };
}

/** A version-bumping prompt without slot reservation */
const VERSION_BUMPING_NO_SLOT = `
## Sprint task

CHANGELOG update needed.
package.json bump to next version.
plugin.json version field update.
`;

/** A version-bumping prompt WITH slot reservation */
const VERSION_BUMPING_WITH_SLOT = `
## Sprint task

Pre-assigned plugin version: 6.43.0. Use ONLY this version; do NOT compute next-available.

CHANGELOG update needed.
package.json version field.
`;

/** A non-version-bumping prompt */
const NON_VERSION_PROMPT = `
## Sprint task

Update the README.md documentation section.
Add a new test for the existing hook.
`;

/** A prompt with worktree isolation hint */
const WITH_WORKTREE = `
You are running with worktree isolation (isolation: "worktree"). Pre-assigned plugin version: 6.43.0.
Update the hook implementation.
`;

/** A prompt with slot reservation + worktree isolation */
const WITH_BOTH = `
Pre-assigned plugin version: 6.43.0. Use ONLY this version; do NOT compute next-available.
You are running with worktree isolation (isolation: "worktree").
Update the hook.
`;

// ─── Test 1: Single spawn → no advisory ──────────────────────────────────────

describe("single_spawn_no_advisory", () => {
  test("single spawn in window → OK pass-through", async () => {
    const sessionId = freshSession();
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );
    // First spawn in session → no second spawn in window → no advisory
    expect(result.message).toContain("OK");
    expect(result.message).toContain("single spawn");
    expect(result.hookSpecificOutput?.additionalContext).toBeUndefined();
  });
});

// ─── Test 2: Two spawns, both carry slot reservation → no version advisory ───

describe("two_spawns_both_reserved", () => {
  test("two spawns with slot reservation → no slot advisory", async () => {
    const sessionId = freshSession();

    // First spawn
    await parallelSpawnVersionAdvisory(
      makeAgentPayload(WITH_BOTH, sessionId)
    );

    // Second spawn (within 60s window — same process, immediate)
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(WITH_BOTH, sessionId)
    );

    // Both carry "Pre-assigned plugin version:" AND worktree isolation → no advisory
    expect(result.message).toContain("OK");
    expect(result.message).not.toContain("ADVISORY");
    expect(result.hookSpecificOutput?.additionalContext).toBeUndefined();
  });
});

// ─── Test 3: Two spawns, neither has slot reservation → advisory emitted ─────

describe("two_spawns_neither_reserved", () => {
  test("two version-bumping spawns without slot reservation → advisory", async () => {
    const sessionId = freshSession();

    // First spawn (no reservation)
    await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );

    // Second spawn (no reservation, version-bumping)
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );

    expect(result.message).toContain("ADVISORY");
    expect(
      result.message.includes("parallel_spawn_no_slot_reservation") ||
        result.message.includes("Pre-assigned plugin version:") ||
        result.message.includes("slot")
    ).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
  });

  test("two spawns without worktree isolation → advisory", async () => {
    const sessionId = freshSession();

    // First spawn (no worktree isolation)
    await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_WITH_SLOT, sessionId)
    );

    // Second spawn (no worktree isolation, has slot)
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_WITH_SLOT, sessionId)
    );

    // Has slot reservation but no worktree isolation
    expect(result.message).toContain("ADVISORY");
    expect(
      result.message.includes("worktree") ||
        result.message.includes("isolation")
    ).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
  });
});

// ─── Test 4: Two spawns, only one has reservation → advisory for missing ──────

describe("two_spawns_one_reserved", () => {
  test("first spawn reserved, second not → advisory on second", async () => {
    const sessionId = freshSession();

    // First spawn: has slot reservation + worktree isolation
    await parallelSpawnVersionAdvisory(
      makeAgentPayload(WITH_BOTH, sessionId)
    );

    // Second spawn: version-bumping but no slot reservation, no worktree isolation
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );

    // Second spawn lacks both → advisory
    expect(result.message).toContain("ADVISORY");
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
  });

  test("first spawn NOT reserved, second IS → first was OK (single in window); no advisory on second", async () => {
    const sessionId = freshSession();

    // First spawn: not reserved (passes as single spawn)
    const first = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );
    expect(first.message).toContain("single spawn"); // first is always OK

    // Second spawn: fully reserved
    const second = await parallelSpawnVersionAdvisory(
      makeAgentPayload(WITH_BOTH, sessionId)
    );

    // Second has slot + worktree → no advisory despite parallel window
    expect(second.message).toContain("OK");
    expect(second.message).not.toContain("ADVISORY");
  });
});

// ─── Test 5: Bypass envvar → no advisory regardless ──────────────────────────

describe("bypass_envvar", () => {
  test("PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS=1 → always pass-through", async () => {
    process.env.PALANTIR_MINI_PARALLEL_SPAWN_ADVISORY_BYPASS = "1";
    const sessionId = freshSession();

    // Even with two version-bumping spawns without reservation → bypass
    await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );
    const result = await parallelSpawnVersionAdvisory(
      makeAgentPayload(VERSION_BUMPING_NO_SLOT, sessionId)
    );

    expect(result.message).toContain("BYPASS");
    expect(result.hookSpecificOutput?.additionalContext).toBeUndefined();
  });
});
