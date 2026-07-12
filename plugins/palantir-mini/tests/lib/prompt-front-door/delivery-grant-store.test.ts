/**
 * Tests for lib/prompt-front-door/delivery-grant-store.ts — pm authorization-
 * flexibility slice 3 (G-DSN-E structured grant mechanism).
 *
 * Coverage:
 *   - readDeliveryGrant returns null when no grant exists.
 *   - issueDeliveryGrant then readDeliveryGrant round-trips.
 *   - issueDeliveryGrantSync then readDeliveryGrant round-trips.
 *   - TTL expiry is treated as a miss (readDeliveryGrant returns null past expiresAt).
 *   - upsert overwrites a prior grant for the same (runtime, sessionId).
 *   - distinct (runtime, sessionId) keys do not collide (per-key isolation).
 *   - PALANTIR_MINI_GLOBAL_STATE_DIR overrides the root — never touches the real
 *     user home during this test (hard hermeticity requirement).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  DELIVERY_GRANT_SAFETY_NET_TTL_MS,
  deliveryGrantStoreRootDir,
  isDeliveryGrantLive,
  issueDeliveryGrant,
  issueDeliveryGrantSync,
  readDeliveryGrant,
  revokeDeliveryGrant,
} from "../../../lib/prompt-front-door/delivery-grant-store";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpGlobalStateDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pm-delivery-grant-store-"));
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR === undefined) {
    delete process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  } else {
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR;
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("delivery-grant-store", () => {
  test("readDeliveryGrant returns null when no grant exists", async () => {
    const grant = await readDeliveryGrant("codex", "session-missing");
    expect(grant).toBeNull();
  });

  test("root dir is rooted under the PALANTIR_MINI_GLOBAL_STATE_DIR override", () => {
    const root = deliveryGrantStoreRootDir();
    expect(root.startsWith(process.env.PALANTIR_MINI_GLOBAL_STATE_DIR!)).toBe(true);
    expect(root).toContain(".palantir-mini");
    expect(root.endsWith(path.join("session", "delivery-grants"))).toBe(true);
  });

  test("issueDeliveryGrant then readDeliveryGrant round-trips", async () => {
    const grant = await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-alpha",
      projectRoot: "/tmp/project-a",
      promptId: "prompt-1",
      promptHash: "sha256:aaa",
    });
    expect(grant.scope).toBe("authorized-delivery");
    expect(typeof grant.grantId).toBe("string");
    expect(grant.grantId.length).toBeGreaterThan(0);

    const read = await readDeliveryGrant("claude", "session-alpha");
    expect(read).toMatchObject({
      grantId: grant.grantId,
      scope: "authorized-delivery",
      runtime: "claude",
      sessionId: "session-alpha",
      projectRoot: "/tmp/project-a",
      promptId: "prompt-1",
      promptHash: "sha256:aaa",
    });
  });

  test("issueDeliveryGrantSync then readDeliveryGrant round-trips", async () => {
    const grant = issueDeliveryGrantSync({
      runtime: "codex",
      sessionId: "session-beta",
      projectRoot: "/tmp/project-b",
      promptId: "prompt-2",
      promptHash: "sha256:bbb",
    });
    const read = await readDeliveryGrant("codex", "session-beta");
    expect(read?.grantId).toBe(grant.grantId);
  });

  test("expiresAt is issuedAt + DELIVERY_GRANT_SAFETY_NET_TTL_MS (24 hours; session-standing until revoked or safety-net expiry)", async () => {
    const nowMs = Date.parse("2026-07-12T00:00:00.000Z");
    const grant = await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-ttl",
      projectRoot: "/tmp/project-ttl",
      promptId: "prompt-ttl",
      promptHash: "sha256:ttl",
      nowMs,
    });
    expect(DELIVERY_GRANT_SAFETY_NET_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(Date.parse(grant.expiresAt) - Date.parse(grant.issuedAt)).toBe(
      DELIVERY_GRANT_SAFETY_NET_TTL_MS,
    );
  });

  test("safety-net expiry is treated as a miss: readDeliveryGrant returns null past expiresAt", async () => {
    const nowMs = Date.parse("2026-07-12T00:00:00.000Z");
    await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-expiring",
      projectRoot: "/tmp/project-expiring",
      promptId: "prompt-expiring",
      promptHash: "sha256:expiring",
      nowMs,
    });

    // Just before expiry — still live.
    const stillLive = await readDeliveryGrant(
      "claude",
      "session-expiring",
      nowMs + DELIVERY_GRANT_SAFETY_NET_TTL_MS - 1,
    );
    expect(stillLive).not.toBeNull();

    // At/after expiry — treated as a miss.
    const expired = await readDeliveryGrant(
      "claude",
      "session-expiring",
      nowMs + DELIVERY_GRANT_SAFETY_NET_TTL_MS + 1,
    );
    expect(expired).toBeNull();
  });

  test("isDeliveryGrantLive matches readDeliveryGrant's own expiry check", async () => {
    const nowMs = Date.parse("2026-07-12T00:00:00.000Z");
    const grant = await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-live-check",
      projectRoot: "/tmp/project-live-check",
      promptId: "prompt-live-check",
      promptHash: "sha256:live-check",
      nowMs,
    });
    expect(isDeliveryGrantLive(grant, nowMs)).toBe(true);
    expect(isDeliveryGrantLive(grant, nowMs + DELIVERY_GRANT_SAFETY_NET_TTL_MS + 1)).toBe(false);
  });

  test("upsert overwrites a prior grant for the same (runtime, sessionId)", async () => {
    const first = await issueDeliveryGrant({
      runtime: "codex",
      sessionId: "session-gamma",
      projectRoot: "/tmp/project-first",
      promptId: "prompt-first",
      promptHash: "sha256:first",
    });
    const second = await issueDeliveryGrant({
      runtime: "codex",
      sessionId: "session-gamma",
      projectRoot: "/tmp/project-second",
      promptId: "prompt-second",
      promptHash: "sha256:second",
    });
    expect(second.grantId).not.toBe(first.grantId);

    const read = await readDeliveryGrant("codex", "session-gamma");
    expect(read?.grantId).toBe(second.grantId);
    expect(read?.projectRoot).toBe("/tmp/project-second");
  });

  test("distinct (runtime, sessionId) keys do not collide", async () => {
    await issueDeliveryGrant({
      runtime: "codex",
      sessionId: "session-shared",
      projectRoot: "/tmp/codex-project",
      promptId: "prompt-codex",
      promptHash: "sha256:codex",
    });
    await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-shared",
      projectRoot: "/tmp/claude-project",
      promptId: "prompt-claude",
      promptHash: "sha256:claude",
    });
    const codexGrant = await readDeliveryGrant("codex", "session-shared");
    const claudeGrant = await readDeliveryGrant("claude", "session-shared");
    expect(codexGrant?.projectRoot).toBe("/tmp/codex-project");
    expect(claudeGrant?.projectRoot).toBe("/tmp/claude-project");
  });
});

describe("revokeDeliveryGrant", () => {
  test("revoking an existing grant makes readDeliveryGrant return null immediately after (no TTL wait needed)", async () => {
    await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-revoke",
      projectRoot: "/tmp/project-revoke",
      promptId: "prompt-revoke",
      promptHash: "sha256:revoke",
    });
    expect(await readDeliveryGrant("claude", "session-revoke")).not.toBeNull();

    const revoked = await revokeDeliveryGrant("claude", "session-revoke");
    expect(revoked).toBe(true);
    expect(await readDeliveryGrant("claude", "session-revoke")).toBeNull();
  });

  test("revoking a non-existent grant returns false and does not throw", async () => {
    const revoked = await revokeDeliveryGrant("claude", "session-never-granted");
    expect(revoked).toBe(false);
  });

  test("revoking one (runtime, sessionId) does not affect a different session's grant", async () => {
    await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-untouched",
      projectRoot: "/tmp/project-untouched",
      promptId: "prompt-untouched",
      promptHash: "sha256:untouched",
    });
    await issueDeliveryGrant({
      runtime: "claude",
      sessionId: "session-to-revoke",
      projectRoot: "/tmp/project-to-revoke",
      promptId: "prompt-to-revoke",
      promptHash: "sha256:to-revoke",
    });

    await revokeDeliveryGrant("claude", "session-to-revoke");

    expect(await readDeliveryGrant("claude", "session-to-revoke")).toBeNull();
    expect(await readDeliveryGrant("claude", "session-untouched")).not.toBeNull();
  });
});
