// palantir-mini sprint-063 W1.B — lock-hold telemetry unit tests.
// Covers: no warning when lock acquired immediately; warning emitted on contention
// exceeding 250ms; telemetry throw isolation (acquireLock still returns on stderr failure).

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { acquireLock, releaseLock, LOCK_SUFFIX } from "../../../lib/event-log/append";

function makeTmpLockDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-append-tel-${label}-`));
  return path.join(dir, `events.jsonl${LOCK_SUFFIX}`);
}

describe("lock-hold telemetry (W1.B)", () => {
  test("Test A: lock acquired immediately — no stderr warning emitted", async () => {
    const lockDir = makeTmpLockDir("a");

    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    const mockWrite = (chunk: string | Uint8Array): boolean => {
      stderrWrites.push(typeof chunk === "string" ? chunk : String(chunk));
      return true;
    };
    (process.stderr as NodeJS.WriteStream).write = mockWrite as typeof process.stderr.write;

    try {
      await acquireLock(lockDir);
      releaseLock(lockDir);
    } finally {
      (process.stderr as NodeJS.WriteStream).write = originalWrite as typeof process.stderr.write;
    }

    const telemetryLines = stderrWrites.filter((s) =>
      s.includes("lock-hold telemetry")
    );
    expect(telemetryLines.length).toBe(0);
  });

  test("Test B: simulated contention with 200ms held lock — warning emitted with correct format", async () => {
    const lockDir = makeTmpLockDir("b");

    // Pre-occupy the lock for 200ms to simulate contention
    fs.mkdirSync(lockDir);
    const releaseTimer = setTimeout(() => {
      releaseLock(lockDir);
    }, 200);

    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    const mockWrite = (chunk: string | Uint8Array): boolean => {
      stderrWrites.push(typeof chunk === "string" ? chunk : String(chunk));
      return true;
    };
    (process.stderr as NodeJS.WriteStream).write = mockWrite as typeof process.stderr.write;

    try {
      await acquireLock(lockDir);
      releaseLock(lockDir);
    } finally {
      clearTimeout(releaseTimer);
      (process.stderr as NodeJS.WriteStream).write = originalWrite as typeof process.stderr.write;
    }

    const telemetryLines = stderrWrites.filter((s) =>
      s.includes("lock-hold telemetry")
    );
    expect(telemetryLines.length).toBeGreaterThanOrEqual(1);

    const line = telemetryLines[0]!;
    expect(line).toContain("[palantir-mini/event-log/append]");
    expect(line).toContain("exceeded 250ms threshold");
    expect(line).toContain(`lock=${lockDir}`);
    // The reported holdTime should be a number > 250
    const match = line.match(/telemetry: (\d+)ms/);
    expect(match).not.toBeNull();
    const reportedMs = parseInt(match![1]!, 10);
    expect(reportedMs).toBeGreaterThan(250);
  }, 10000);

  test("Test C: telemetry throw does not propagate into acquireLock", async () => {
    const lockDir = makeTmpLockDir("c");

    const originalWrite = process.stderr.write.bind(process.stderr);
    const throwingWrite = (_chunk: string | Uint8Array): boolean => {
      throw new Error("simulated stderr.write failure");
    };
    (process.stderr as NodeJS.WriteStream).write = throwingWrite as typeof process.stderr.write;

    // Pre-occupy the lock for 200ms so telemetry branch is triggered
    fs.mkdirSync(lockDir);
    const releaseTimer = setTimeout(() => {
      releaseLock(lockDir);
    }, 200);

    let acquireError: Error | null = null;
    try {
      await acquireLock(lockDir);
      releaseLock(lockDir);
    } catch (err) {
      acquireError = err as Error;
    } finally {
      clearTimeout(releaseTimer);
      (process.stderr as NodeJS.WriteStream).write = originalWrite as typeof process.stderr.write;
    }

    // acquireLock MUST succeed despite stderr.write throwing
    expect(acquireError).toBeNull();
  }, 10000);

  test("Test D: stale legacy lock directory is recovered", async () => {
    const lockDir = makeTmpLockDir("d");
    fs.mkdirSync(lockDir);
    const old = new Date(Date.now() - 120_000);
    fs.utimesSync(lockDir, old, old);

    await acquireLock(lockDir, {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
      staleLockMs: 1_000,
    });

    expect(fs.existsSync(path.join(lockDir, "owner.json"))).toBe(true);
    releaseLock(lockDir);
    expect(fs.existsSync(lockDir)).toBe(false);
  });

  test("Test E: live owner metadata is not treated as stale", async () => {
    const lockDir = makeTmpLockDir("e");
    await acquireLock(lockDir);

    let acquireError: Error | null = null;
    await new Promise((resolve) => setTimeout(resolve, 5));
    try {
      await acquireLock(lockDir, {
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 1,
        staleLockMs: 1,
      });
    } catch (err) {
      acquireError = err as Error;
    } finally {
      releaseLock(lockDir);
    }

    expect(acquireError?.message).toContain("failed to acquire lock");
    expect(fs.existsSync(lockDir)).toBe(false);
  });

  test("Test F: dead local owner metadata is recovered without waiting for TTL", async () => {
    const lockDir = makeTmpLockDir("f");
    fs.mkdirSync(lockDir);
    fs.writeFileSync(
      path.join(lockDir, "owner.json"),
      JSON.stringify({
        pid: 999999999,
        hostname: os.hostname(),
        createdAt: new Date().toISOString(),
        token: "dead-owner",
      }),
      "utf8",
    );

    await acquireLock(lockDir, {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
      staleLockMs: 60_000,
    });

    const owner = JSON.parse(fs.readFileSync(path.join(lockDir, "owner.json"), "utf8")) as {
      token: string;
    };
    expect(owner.token).not.toBe("dead-owner");
    releaseLock(lockDir);
  });
});
