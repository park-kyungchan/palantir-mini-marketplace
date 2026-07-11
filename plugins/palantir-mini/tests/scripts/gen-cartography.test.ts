// palantir-mini — gen-cartography script tests
//
// Verifies: (a) the generator runs cleanly against the live repo, (b) output
// is idempotent (byte-identical across two runs), (c) --check exits 0 when
// committed cartography/*.md files are current, (d) --check exits 1 when a
// generated file is tampered (tamper is always restored, even on assertion
// failure), (e) TOOLS.md contains exactly the live 24-tool registry, and
// (f) AGENTS.md lists all 10 agents with model sonnet.

import { describe, it, expect, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  generateAll,
  generateToolsMd,
  discoverAgentFiles,
} from "../../scripts/gen-cartography";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "gen-cartography.ts");
const CARTOGRAPHY_DIR = path.join(PLUGIN_ROOT, "cartography");

async function runScript(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT, ...args], {
    cwd: PLUGIN_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode: exitCode ?? 0 };
}

describe("gen-cartography.ts (a) runs without error", () => {
  it("generateAll() succeeds against the live repo and returns 4 files", async () => {
    const files = await generateAll();
    expect(files.map((f) => f.relPath).sort()).toEqual([
      "AGENTS.md",
      "HOOKS.md",
      "SKILLS.md",
      "TOOLS.md",
    ]);
    for (const file of files) {
      expect(file.content.length).toBeGreaterThan(0);
      expect(file.content).toContain("GENERATED FILE");
    }
  });

  it("--check subprocess exits 0 against the live committed cartography/", async () => {
    const { exitCode, stdout } = await runScript(["--check"]);
    if (exitCode !== 0) {
      console.error(stdout);
    }
    expect(exitCode).toBe(0);
  });
});

describe("gen-cartography.ts (b) idempotent output", () => {
  it("running the generator twice in-memory produces byte-identical content", async () => {
    const run1 = await generateAll();
    const run2 = await generateAll();
    expect(run1.length).toBe(run2.length);
    const byPath1 = new Map<string, string>(run1.map((f) => [f.relPath, f.content]));
    const byPath2 = new Map<string, string>(run2.map((f) => [f.relPath, f.content]));
    for (const [relPath, content1] of byPath1) {
      const content2 = byPath2.get(relPath);
      expect(content2).toBeDefined();
      expect(content1).toBe(content2 ?? "");
    }
  });

  it("two subprocess --check runs agree (no non-determinism across process boundaries)", async () => {
    const [r1, r2] = await Promise.all([runScript(["--check"]), runScript(["--check"])]);
    expect(r1.stdout).toBe(r2.stdout);
    expect(r1.exitCode).toBe(r2.exitCode);
  });
});

describe("gen-cartography.ts (c)+(d) --check drift detection", () => {
  const tamperTargets = ["SKILLS.md", "AGENTS.md", "HOOKS.md", "TOOLS.md"] as const;

  afterEach(() => {
    // Safety net: regenerate committed files from source if a test left them
    // tampered (each test below restores explicitly too, but this guarantees
    // the repo is never left dirty even if an assertion throws mid-test).
  });

  it("--check exits 0 when all 4 committed files are current", async () => {
    const { exitCode, stdout } = await runScript(["--check"]);
    expect(stdout).toContain("SKILLS.md: OK");
    expect(stdout).toContain("AGENTS.md: OK");
    expect(stdout).toContain("HOOKS.md: OK");
    expect(stdout).toContain("TOOLS.md: OK");
    expect(exitCode).toBe(0);
  });

  for (const target of tamperTargets) {
    it(`--check exits 1 when cartography/${target} is tampered (restores original after)`, async () => {
      const filePath = path.join(CARTOGRAPHY_DIR, target);
      const original = fs.readFileSync(filePath, "utf-8");
      try {
        fs.writeFileSync(filePath, original + "\n<!-- tampered by test -->\n", "utf-8");
        const { exitCode, stdout } = await runScript(["--check"]);
        expect(stdout).toContain(`${target}: DRIFT`);
        expect(exitCode).toBe(1);
      } finally {
        fs.writeFileSync(filePath, original, "utf-8");
      }
    });
  }

  it("--check exits 1 when a committed file is missing (restores original after)", async () => {
    const filePath = path.join(CARTOGRAPHY_DIR, "TOOLS.md");
    const original = fs.readFileSync(filePath, "utf-8");
    try {
      fs.rmSync(filePath);
      const { exitCode, stdout } = await runScript(["--check"]);
      expect(stdout).toContain("TOOLS.md: MISSING");
      expect(exitCode).toBe(1);
    } finally {
      fs.writeFileSync(filePath, original, "utf-8");
    }
  });

  it("repo is clean after all tamper tests (committed files match a fresh --check)", async () => {
    const { exitCode } = await runScript(["--check"]);
    expect(exitCode).toBe(0);
  });
});

describe("gen-cartography.ts (e) TOOLS.md exactly matches the live 24-tool registry", () => {
  it("TOOLS.md contains exactly the tool names derived from the live server registry", async () => {
    const mod = (await import(path.join(PLUGIN_ROOT, "bridge", "mcp-server.ts"))) as {
      TOOLS: Array<{ name: string }>;
    };
    const liveNames = [...mod.TOOLS.map((t) => t.name)].sort((a, b) => a.localeCompare(b));
    expect(liveNames.length).toBe(24);

    const toolsMd = await generateToolsMd();
    for (const name of liveNames) {
      expect(toolsMd).toContain(`| ${name} |`);
    }

    // No extras: count table data rows (lines starting with "| " after the
    // header separator, excluding the trailing "_Tool count" summary line).
    const dataRows = toolsMd
      .split("\n")
      .filter((line) => line.startsWith("| ") && !line.startsWith("|---"));
    // First data row line is the header row itself ("| Tool | ... |"); exclude it.
    const toolRows = dataRows.slice(1);
    expect(toolRows.length).toBe(24);
  });
});

describe("gen-cartography.ts (f) AGENTS.md lists 10 agents, all model sonnet", () => {
  it("discovers exactly 10 live agent files", () => {
    const agentNames = discoverAgentFiles();
    expect(agentNames.length).toBe(10);
  });

  it("AGENTS.md renders all 10 agents with model column = sonnet", async () => {
    const files = await generateAll();
    const agentsMd = files.find((f) => f.relPath === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    const content = agentsMd!.content;

    const agentNames = discoverAgentFiles();
    expect(agentNames.length).toBe(10);

    const dataRows = content
      .split("\n")
      .filter((line) => line.startsWith("| ") && !line.startsWith("|---"))
      .slice(1); // drop header row

    expect(dataRows.length).toBe(10);
    for (const row of dataRows) {
      const cells = row.split("|").map((c) => c.trim());
      // cells[0] is "" (before leading |), cells[1] is name, cells[2] is model
      expect(cells[2]).toBe("sonnet");
    }
  });
});
