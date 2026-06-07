// palantir-mini — tests/lib/agents/deprecation.test.ts
// Validates that subagent-start.ts correctly emits project_agent_collision_detected
// and denies spawn for agents past their deprecationWindowEndsSprint.
//
// PR-14a (sprint-077): retire pm/mc/kosmos/home-implementer (window ended sprint 65).

import { describe, expect, test } from "bun:test";
import {
  readFrontmatterField,
  checkDeprecationGate,
  inferCurrentSprint,
} from "../../../hooks/subagent-start";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── readFrontmatterField ─────────────────────────────────────────────────────

describe("readFrontmatterField", () => {
  const sample = `---
name: pm-implementer
deprecated: true
deprecationWindowEndsSprint: 65
description: >
  Some description.
---

# Body
`;

  test("reads boolean field", () => {
    expect(readFrontmatterField(sample, "deprecated")).toBe("true");
  });

  test("reads numeric field", () => {
    expect(readFrontmatterField(sample, "deprecationWindowEndsSprint")).toBe("65");
  });

  test("reads string field", () => {
    expect(readFrontmatterField(sample, "name")).toBe("pm-implementer");
  });

  test("returns null for missing field", () => {
    expect(readFrontmatterField(sample, "nonexistent")).toBeNull();
  });

  test("returns null when no frontmatter block", () => {
    expect(readFrontmatterField("# Just body\nno frontmatter", "name")).toBeNull();
  });

  test("strips double quotes from value", () => {
    const content = `---\nname: "quoted"\n---\n\nbody`;
    expect(readFrontmatterField(content, "name")).toBe("quoted");
  });

  test("strips single quotes from value", () => {
    const content = `---\nname: 'single'\n---\n\nbody`;
    expect(readFrontmatterField(content, "name")).toBe("single");
  });
});

// ─── checkDeprecationGate ─────────────────────────────────────────────────────

describe("checkDeprecationGate", () => {
  function makeTempDir(agentName: string, content: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "palantir-mini-dep-test-"));
    const agentsDir = path.join(dir, ".claude", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, `${agentName}.md`), content);
    return dir;
  }

  test("blocks pm-implementer (window ended sprint 65, current 77)", () => {
    const content = `---
name: pm-implementer
deprecated: true
supersededBy: project-implementer
deprecationWindowEndsSprint: 65
description: >
  [RETIRED v6.0.0 — use project-implementer]
tools: Read
model: sonnet
---

# Body
`;
    const cwd = makeTempDir("pm-implementer", content);
    try {
      // Override current sprint detection to return 77
      // We can't easily mock inferCurrentSprint, so we rely on the file-based
      // detection falling back to the hardcoded sentinel (77) when no sprints dir.
      const result = checkDeprecationGate("pm-implementer", cwd);
      expect(result.blocked).toBe(true);
      if (result.blocked) {
        expect(result.endedSprint).toBe(65);
        expect(result.currentSprint).toBe(77); // fallback sentinel
        expect(result.reason).toContain("pm-implementer");
        expect(result.reason).toContain("project-implementer");
      }
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("does not block agent without deprecated flag", () => {
    const content = `---
name: implementer
description: Active agent.
tools: Read
model: sonnet
---

# Body
`;
    const cwd = makeTempDir("implementer", content);
    try {
      const result = checkDeprecationGate("implementer", cwd);
      expect(result.blocked).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("does not block deprecated agent still inside window", () => {
    const content = `---
name: soon-deprecated
deprecated: true
deprecationWindowEndsSprint: 999
description: Still in window.
---

# Body
`;
    const cwd = makeTempDir("soon-deprecated", content);
    try {
      const result = checkDeprecationGate("soon-deprecated", cwd);
      expect(result.blocked).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("does not block deprecated agent without deprecationWindowEndsSprint", () => {
    const content = `---
name: old-agent
deprecated: true
description: Deprecated but no sprint set.
---

# Body
`;
    const cwd = makeTempDir("old-agent", content);
    try {
      const result = checkDeprecationGate("old-agent", cwd);
      // No window end means advisory only — not hard blocked
      expect(result.blocked).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("returns blocked=false when agent file not found", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "palantir-mini-no-agent-"));
    try {
      const result = checkDeprecationGate("nonexistent-agent", cwd);
      expect(result.blocked).toBe(false);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});



// ─── inferCurrentSprint ───────────────────────────────────────────────────────

describe("inferCurrentSprint", () => {
  test("returns fallback (77) when sprints dir does not exist", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sprint-fallback-"));
    try {
      expect(inferCurrentSprint(cwd)).toBe(77);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("returns highest sprint number from sprints dir", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sprint-dir-"));
    try {
      const sprintsDir = path.join(cwd, ".palantir-mini", "harness", "sprints");
      fs.mkdirSync(sprintsDir, { recursive: true });
      fs.mkdirSync(path.join(sprintsDir, "sprint-070-quick"));
      fs.mkdirSync(path.join(sprintsDir, "sprint-077-pr-14"));
      fs.mkdirSync(path.join(sprintsDir, "sprint-065-feature"));
      expect(inferCurrentSprint(cwd)).toBe(77);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
