// palantir-mini — check-agent-model-policy tests (Sonnet-only subagent model policy)
//
// Owner directive: "subagents are ALWAYS spawned as Sonnet with maximum
// reasoning effort and must be given the clearest possible briefs."
//
// Covers:
//   1. Live-repo green gate: checkAgentModelPolicy() → pass (every active
//      agents/*.md declares model: sonnet).
//   2. total pins to the current active-agent count (agents/.archived/ excluded).
//   3. Drift detection — non-sonnet model value (e.g. a stale "opus") on a
//      temp copy of the plugin root fails loud, naming the offending file.
//   4. Drift detection — missing `model:` frontmatter field fails loud.
//   5. Release-mode wiring: pmPluginSelfCheck({ mode: "release" }) carries
//      agentModelPolicyResult and lists "agent-model-policy" in activeChecks.
//   6. agent-model-policy mode narrowly gates only this axis.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../../bridge/handlers/pm-plugin-self-check";
import { checkAgentModelPolicy } from "../../../../bridge/handlers/pm-plugin-self-check/check-agent-model-policy";
import { resolvePalantirMiniRoot } from "../../../../lib/config/root";

const eventsEnv = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-agentmodel-"));
  process.env.PALANTIR_MINI_PROJECT = dir;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(dir, "events.jsonl");
};

/**
 * Build a throwaway pluginRoot whose agents/ is a copy of the live agents dir,
 * so a test can mutate a single agent's frontmatter (simulate stale "opus" /
 * missing `model:`) without touching the live repo. checkAgentModelPolicy()
 * resolves PLUGIN_ROOT from its own module location, not from an argument, so
 * these mutation tests exercise the underlying agents/ directory walk via a
 * hand-rolled equivalent read rather than re-pointing PLUGIN_ROOT.
 */
function tempAgentsDirFromLive(): string {
  const liveAgents = path.join(resolvePalantirMiniRoot(), "agents");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-agentmodel-root-"));
  fs.cpSync(liveAgents, path.join(root, "agents"), { recursive: true });
  return root;
}

/** Minimal re-implementation of the frontmatter walk against an arbitrary agentsDir, for drift-injection tests. */
function walkAgentModelPolicy(agentsDir: string) {
  const files = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  const violations: string[] = [];
  const compliant: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(agentsDir, file), "utf8");
    const fmEnd = source.startsWith("---\n") ? source.indexOf("\n---", 4) : -1;
    const frontmatter = fmEnd >= 0 ? source.slice(4, fmEnd) : null;
    if (frontmatter === null) {
      violations.push(`${file}: no frontmatter block found`);
      continue;
    }
    const match = frontmatter.match(/^model:\s*(.+?)\s*$/m);
    if (!match) {
      violations.push(`${file}: missing model: field`);
      continue;
    }
    const value = (match[1] ?? "").trim();
    if (value !== "sonnet") {
      violations.push(`${file}: model is "${value}"`);
      continue;
    }
    compliant.push(file);
  }
  return { total: files.length, violations, compliant };
}

describe("check-agent-model-policy", () => {
  test("1. live repo: every active agent declares model: sonnet", () => {
    const result = checkAgentModelPolicy();
    expect(result.status).toBe("pass");
    expect(result.violations).toEqual([]);
  });

  test("2. total pins to the current active-agent count (.archived/ excluded)", () => {
    const result = checkAgentModelPolicy();
    expect(result.total).toBe(10);
    expect(result.compliant.length).toBe(10);
  });

  test("3. drift: a stale non-sonnet model value fails loud, naming the file", () => {
    const root = tempAgentsDirFromLive();
    const agentsDir = path.join(root, "agents");
    const target = path.join(agentsDir, "researcher.md");
    const source = fs.readFileSync(target, "utf8");
    const mutated = source.replace(/^model:\s*sonnet\s*$/m, "model: opus");
    expect(mutated).not.toBe(source);
    fs.writeFileSync(target, mutated);

    const { violations, compliant, total } = walkAgentModelPolicy(agentsDir);
    expect(violations.some((v) => v.startsWith("researcher.md:") && v.includes("opus"))).toBe(true);
    expect(compliant).not.toContain("researcher.md");
    expect(total).toBe(10);

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("4. drift: a missing model: frontmatter field fails loud, naming the file", () => {
    const root = tempAgentsDirFromLive();
    const agentsDir = path.join(root, "agents");
    const target = path.join(agentsDir, "implementer.md");
    const source = fs.readFileSync(target, "utf8");
    const mutated = source.replace(/^model:\s*sonnet\s*\n/m, "");
    expect(mutated).not.toBe(source);
    fs.writeFileSync(target, mutated);

    const { violations, compliant } = walkAgentModelPolicy(agentsDir);
    expect(violations.some((v) => v.startsWith("implementer.md:") && v.includes("missing"))).toBe(true);
    expect(compliant).not.toContain("implementer.md");

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("5. release mode carries the agent-model-policy axis", async () => {
    eventsEnv();
    const release = await pmPluginSelfCheck({ mode: "release" });
    expect(release.agentModelPolicyResult).toBeDefined();
    expect(release.agentModelPolicyResult.status).toBe("pass");
    expect(release.activeChecks).toContain("agent-model-policy");
  });

  test("6. agent-model-policy mode narrowly gates only this axis", async () => {
    eventsEnv();
    const result = await pmPluginSelfCheck({ mode: "agent-model-policy" });
    expect(result.mode).toBe("agent-model-policy");
    expect(result.activeChecks).toEqual(["agent-model-policy"]);
    expect(result.agentModelPolicyResult.status).toBe("pass");
    expect(result.activeChecks).not.toContain("agents");
  });
});
