// palantir-mini v4.9.0 / sprint-055 W3.B — stale-memory enhancement test
//
// Coverage:
//   - fresh memory file (mtime < 30d) → not flagged
//   - stale memory file (mtime > 30d) → flagged + classified by frontmatter type
//   - missing memory dir → empty result (graceful)

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import pmMemoryLayerAudit from "../../../bridge/handlers/pm-memory-layer-audit";

const tmpProjects: string[] = [];

afterEach(() => {
  for (const p of tmpProjects.splice(0)) fs.rmSync(p, { recursive: true, force: true });
});

function makeTmpProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-stale-mem-"));
  tmpProjects.push(project);
  return project;
}

function memoryDirFor(project: string): string {
  const sanitized = project.replace(/^\//, "").replace(/[\/\\]+/g, "-");
  return path.join(project, ".claude", "projects", `-${sanitized}`, "memory");
}

function writeMemFile(project: string, name: string, type: string, ageDays: number): string {
  const dir = memoryDirFor(project);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: test\ntype: ${type}\n---\n\nbody`, "utf8");
  // Backdate mtime
  const ago = Date.now() - ageDays * 24 * 60 * 60 * 1000;
  fs.utimesSync(file, ago / 1000, ago / 1000);
  return file;
}

describe("pm_memory_layer_audit — stale-memory enhancement (W3.B)", () => {
  test("fresh memory file (15d old) NOT flagged", async () => {
    const project = makeTmpProject();
    writeMemFile(project, "fresh.md", "feedback", 15);
    const result = await pmMemoryLayerAudit({ project });
    expect(result.staleMemoryFiles?.length).toBe(0);
  });

  test("stale memory file (45d old) flagged + classified by type", async () => {
    const project = makeTmpProject();
    writeMemFile(project, "stale-feedback.md", "feedback", 45);
    writeMemFile(project, "stale-user.md", "user", 60);
    writeMemFile(project, "stale-project.md", "project", 90);
    writeMemFile(project, "stale-reference.md", "reference", 35);
    const result = await pmMemoryLayerAudit({ project });
    expect(result.staleMemoryFiles?.length).toBe(4);
    expect(result.staleByLayer?.procedural).toBe(1); // feedback
    expect(result.staleByLayer?.semantic).toBe(2);   // user + reference
    expect(result.staleByLayer?.episodic).toBe(1);   // project
    expect(result.staleByLayer?.working).toBe(0);
  });

  test("missing memory dir → empty staleMemoryFiles (graceful)", async () => {
    const project = makeTmpProject();
    const result = await pmMemoryLayerAudit({ project });
    expect(result.staleMemoryFiles).toEqual([]);
    expect(result.staleByLayer).toEqual({ working: 0, episodic: 0, semantic: 0, procedural: 0 });
  });

  test("MEMORY.md skipped (only memory entries audited)", async () => {
    const project = makeTmpProject();
    const dir = memoryDirFor(project);
    fs.mkdirSync(dir, { recursive: true });
    const memoryMd = path.join(dir, "MEMORY.md");
    fs.writeFileSync(memoryMd, "# index", "utf8");
    const ago = Date.now() - 60 * 24 * 60 * 60 * 1000;
    fs.utimesSync(memoryMd, ago / 1000, ago / 1000);
    const result = await pmMemoryLayerAudit({ project });
    expect(result.staleMemoryFiles?.length).toBe(0);
  });

  test("missing frontmatter type defaults to semantic layer", async () => {
    const project = makeTmpProject();
    const dir = memoryDirFor(project);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "no-type.md");
    fs.writeFileSync(file, "---\nname: x\n---\nbody", "utf8");
    const ago = Date.now() - 45 * 24 * 60 * 60 * 1000;
    fs.utimesSync(file, ago / 1000, ago / 1000);
    const result = await pmMemoryLayerAudit({ project });
    expect(result.staleMemoryFiles?.length).toBe(1);
    expect(result.staleMemoryFiles?.[0]!.layer).toBe("semantic");
  });
});
