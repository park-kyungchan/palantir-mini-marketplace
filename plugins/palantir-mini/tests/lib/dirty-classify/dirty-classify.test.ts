// palantir-mini v4.9.0 / sprint-055 W2.A — dirty-classify lib tests
//
// Coverage: 4-axis classifier purity + parsePorcelainLine edge cases +
// scope-out-of-scope detection.

import { test, expect, describe } from "bun:test";
import {
  classifyPath,
  classifyDirty,
  parsePorcelainLine,
  isOutOfScope,
  formatSummary,
  entriesByAxis,
} from "../../../lib/dirty-classify";

describe("classifyPath", () => {
  test("auto-regen — chrome-native-host", () => {
    expect(classifyPath(".claude/chrome/chrome-native-host").axis).toBe("auto-regen");
  });

  test("auto-regen — codex-plugin sibling manifest", () => {
    expect(classifyPath(".claude/plugins/palantir-mini/.codex-plugin/plugin.json").axis).toBe("auto-regen");
  });

  test("auto-regen — cursor-plugin sibling manifest", () => {
    expect(classifyPath(".claude/plugins/palantir-mini/.cursor-plugin/plugin.json").axis).toBe("auto-regen");
  });

  test("auto-regen — src/generated/", () => {
    expect(classifyPath("src/generated/objects.ts").axis).toBe("auto-regen");
    expect(classifyPath("projects/palantir-math/src/generated/foo.ts").axis).toBe("auto-regen");
  });

  test("runtime-substrate — events.jsonl", () => {
    expect(classifyPath(".palantir-mini/session/events.jsonl").axis).toBe("runtime-substrate");
    expect(classifyPath("projects/palantir-math/.palantir-mini/session/events.jsonl").axis).toBe("runtime-substrate");
  });

  test("runtime-substrate — outcome-pairs/", () => {
    expect(classifyPath(".palantir-mini/session/outcome-pairs/pair-abc.json").axis).toBe("runtime-substrate");
  });

  test("runtime-substrate — scheduled_tasks.lock", () => {
    expect(classifyPath(".claude/scheduled_tasks.lock").axis).toBe("runtime-substrate");
  });

  test("ephemeral — tracked-project transcript", () => {
    expect(classifyPath(".claude/projects/-home-palantirkc-projects-hyperframes/abc.jsonl").axis).toBe("ephemeral");
  });

  test("ephemeral — home session subdir", () => {
    expect(classifyPath(".claude/projects/-home-palantirkc/abc-def-ghi/tool-results/x.txt").axis).toBe("ephemeral");
  });

  test("user-WIP — random source file", () => {
    expect(classifyPath("projects/hyperframes/packages/cli/src/commands/lecture.ts").axis).toBe("user-WIP");
  });

  test("user-WIP — random doc file", () => {
    expect(classifyPath("docs/something/foo.mdx").axis).toBe("user-WIP");
  });
});

describe("parsePorcelainLine", () => {
  test("modified file", () => {
    expect(parsePorcelainLine(" M projects/foo/bar.ts")).toEqual({ status: "M", path: "projects/foo/bar.ts" });
  });

  test("untracked", () => {
    expect(parsePorcelainLine("?? projects/foo/baz.ts")).toEqual({ status: "??", path: "projects/foo/baz.ts" });
  });

  test("deleted", () => {
    expect(parsePorcelainLine(" D projects/foo/old.ts")).toEqual({ status: "D", path: "projects/foo/old.ts" });
  });

  test("rename — extracts target path", () => {
    expect(parsePorcelainLine("R  old.ts -> new.ts")).toEqual({ status: "R", path: "new.ts" });
  });

  test("quoted path with space", () => {
    expect(parsePorcelainLine("?? \"foo bar.ts\"")).toEqual({ status: "??", path: "foo bar.ts" });
  });

  test("empty line returns null", () => {
    expect(parsePorcelainLine("")).toBeNull();
    expect(parsePorcelainLine("xx")).toBeNull();
  });
});

describe("classifyDirty", () => {
  test("classifies a typical mixed git status output", () => {
    const porcelain = [
      " M projects/hyperframes/package.json",
      "?? .claude/.last-cleanup",
      "?? .claude/projects/-home-palantirkc-projects-hyperframes/abc.jsonl",
      "?? .claude/scheduled_tasks.lock",
      "?? src/generated/foo.ts",
    ].join("\n");

    const result = classifyDirty(porcelain);
    expect(result.total).toBe(5);
    expect(result.byAxis["user-WIP"]).toBe(1);          // hyperframes package.json
    expect(result.byAxis["runtime-substrate"]).toBe(2); // .last-cleanup + scheduled_tasks.lock
    expect(result.byAxis["ephemeral"]).toBe(1);          // hyperframes transcript
    expect(result.byAxis["auto-regen"]).toBe(1);         // src/generated
  });

  test("empty input returns empty result", () => {
    const result = classifyDirty("");
    expect(result.total).toBe(0);
    expect(result.byAxis["user-WIP"]).toBe(0);
  });
});

describe("entriesByAxis", () => {
  test("filters to single axis", () => {
    const result = classifyDirty([
      " M projects/foo/bar.ts",
      "?? .claude/scheduled_tasks.lock",
    ].join("\n"));
    const wip = entriesByAxis(result, "user-WIP");
    expect(wip.length).toBe(1);
    expect(wip[0]!.path).toBe("projects/foo/bar.ts");
  });
});

describe("isOutOfScope", () => {
  const wipEntry = {
    status: "M",
    path:   "projects/hyperframes/foo.ts",
    axis:   "user-WIP" as const,
    action: "preserve" as const,
    reason: "test",
  };

  test("user-WIP outside scope → block", () => {
    expect(isOutOfScope(wipEntry, ["projects/palantir-math/"])).toBe(true);
  });

  test("user-WIP inside scope (prefix) → allow", () => {
    expect(isOutOfScope(wipEntry, ["projects/hyperframes/"])).toBe(false);
  });

  test("user-WIP inside scope (exact path) → allow", () => {
    expect(isOutOfScope(wipEntry, ["projects/hyperframes/foo.ts"])).toBe(false);
  });

  test("empty scope → never blocks", () => {
    expect(isOutOfScope(wipEntry, [])).toBe(false);
  });

  test("non-user-WIP entry → never blocks regardless of scope", () => {
    const ephem = { ...wipEntry, axis: "ephemeral" as const };
    expect(isOutOfScope(ephem, ["projects/palantir-math/"])).toBe(false);
  });

  test("glob prefix match", () => {
    expect(isOutOfScope(wipEntry, ["projects/*/foo.ts"])).toBe(false);
    expect(isOutOfScope(wipEntry, ["projects/*/bar.ts"])).toBe(true);
  });
});

describe("formatSummary", () => {
  test("renders 4-axis breakdown", () => {
    const result = classifyDirty([
      " M foo.ts",
      "?? .claude/scheduled_tasks.lock",
    ].join("\n"));
    const out = formatSummary(result);
    expect(out).toContain("Total dirty: 2");
    expect(out).toContain("user-WIP:");
    expect(out).toContain("runtime-substrate:");
  });
});
