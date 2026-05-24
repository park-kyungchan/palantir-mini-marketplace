// palantir-mini v3.5.0 — pm-preamble sibling: git branch probe (Bun-specific)

/** Best-effort git branch via Bun.spawn; "unknown" on any failure. */
export async function currentBranch(cwd: string): Promise<string> {
  try {
    const bunGlobal = (globalThis as { Bun?: { spawn: (args: unknown) => unknown } }).Bun;
    if (!bunGlobal || typeof bunGlobal.spawn !== "function") return "unknown";

    const proc = bunGlobal.spawn({
      cmd: ["git", "branch", "--show-current"],
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    }) as {
      exited: Promise<number>;
      stdout: ReadableStream<Uint8Array>;
    };
    const exitCode = await proc.exited;
    if (exitCode !== 0) return "unknown";
    const text = await new Response(proc.stdout).text();
    const name = text.trim();
    return name.length > 0 ? name : "unknown";
  } catch {
    return "unknown";
  }
}
