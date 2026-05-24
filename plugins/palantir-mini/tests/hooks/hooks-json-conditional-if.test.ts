// palantir-mini W1.A — hooks-json-conditional-if tests
// Verifies that 3 PostToolUse entries have the correct `if:` field added
// per the audit plan mellow-plotting-oasis.md §Wave 1 W1.A.
// Claude Code v2.1.85+ `if:` syntax: when false, hook process is NOT spawned.

import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const HOOKS_JSON_PATH = join(
  import.meta.dir,
  "../../hooks/hooks.json"
);

interface HookEntry {
  type: string;
  command: string;
  if?: string;
  timeout?: number;
  async?: boolean;
  statusMessage?: string;
  decision?: string;
}

interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface HooksJson {
  description: string;
  hooks: {
    PostToolUse?: HookGroup[];
    [key: string]: HookGroup[] | undefined;
  };
}

function loadHooksJson(): HooksJson {
  const raw = readFileSync(HOOKS_JSON_PATH, "utf-8");
  return JSON.parse(raw) as HooksJson;
}

function findPostToolUseEntry(
  hooksJson: HooksJson,
  commandSubstring: string
): HookEntry | undefined {
  const postToolUse = hooksJson.hooks.PostToolUse ?? [];
  for (const group of postToolUse) {
    for (const entry of group.hooks) {
      if (entry.command.includes(commandSubstring)) {
        return entry;
      }
    }
  }
  return undefined;
}

function findPostToolUseGroup(
  hooksJson: HooksJson,
  commandSubstring: string
): HookGroup | undefined {
  const postToolUse = hooksJson.hooks.PostToolUse ?? [];
  for (const group of postToolUse) {
    for (const entry of group.hooks) {
      if (entry.command.includes(commandSubstring)) {
        return group;
      }
    }
  }
  return undefined;
}

describe("hooks.json conditional if: field (W1.A)", () => {
  describe("post-edit-verifier-suggest", () => {
    test("has if: field with exact string", () => {
      const hooksJson = loadHooksJson();
      const entry = findPostToolUseEntry(hooksJson, "post-edit-verifier-suggest");
      expect(entry).toBeDefined();
      expect(entry!.if).toBe("Edit|Write|MultiEdit(!**.d.ts|*.test.ts)");
    });

    test("still has original matcher on its group (matcher not removed)", () => {
      const hooksJson = loadHooksJson();
      const group = findPostToolUseGroup(hooksJson, "post-edit-verifier-suggest");
      expect(group).toBeDefined();
      expect(group!.matcher).toBe("Edit|Write|MultiEdit");
    });
  });

  describe("semantic-frontmatter-validate (PostToolUse)", () => {
    test("has if: field with exact string", () => {
      const hooksJson = loadHooksJson();
      // There are two entries for semantic-frontmatter-validate (PreToolUse + PostToolUse).
      // We target the PostToolUse group whose matcher is the schema path glob.
      const postToolUse = hooksJson.hooks.PostToolUse ?? [];
      let entry: HookEntry | undefined;
      for (const group of postToolUse) {
        for (const e of group.hooks) {
          if (e.command.includes("semantic-frontmatter-validate")) {
            entry = e;
            break;
          }
        }
        if (entry) break;
      }
      expect(entry).toBeDefined();
      expect(entry!.if).toBe("Edit(**/schemas/ontology/**/primitives/**/*.ts)");
    });

    test("still has original matcher on its group (matcher not removed)", () => {
      const hooksJson = loadHooksJson();
      const postToolUse = hooksJson.hooks.PostToolUse ?? [];
      let group: HookGroup | undefined;
      for (const g of postToolUse) {
        for (const e of g.hooks) {
          if (e.command.includes("semantic-frontmatter-validate")) {
            group = g;
            break;
          }
        }
        if (group) break;
      }
      expect(group).toBeDefined();
      expect(group!.matcher).toBe(
        "**/schemas/ontology/(primitives|contracts|codegen)/**/*.ts"
      );
    });
  });

  describe("generated-header-check", () => {
    test("has if: field with exact string", () => {
      const hooksJson = loadHooksJson();
      const entry = findPostToolUseEntry(hooksJson, "generated-header-check");
      expect(entry).toBeDefined();
      expect(entry!.if).toBe("Write(**/*.ts)");
    });

    test("still has original matcher on its group (matcher not removed)", () => {
      const hooksJson = loadHooksJson();
      const group = findPostToolUseGroup(hooksJson, "generated-header-check");
      expect(group).toBeDefined();
      expect(group!.matcher).toBe("**/src/generated/**");
    });
  });

  describe("structural integrity", () => {
    test("hooks.json parses as valid JSON", () => {
      expect(() => loadHooksJson()).not.toThrow();
    });

    test("PostToolUse section exists with entries", () => {
      const hooksJson = loadHooksJson();
      expect(hooksJson.hooks.PostToolUse).toBeDefined();
      expect((hooksJson.hooks.PostToolUse ?? []).length).toBeGreaterThan(0);
    });

    test("all 3 target entries have both matcher (group) and if (entry)", () => {
      const hooksJson = loadHooksJson();
      const targets = [
        "post-edit-verifier-suggest",
        "semantic-frontmatter-validate",
        "generated-header-check",
      ];
      for (const target of targets) {
        const entry = findPostToolUseEntry(hooksJson, target);
        const group = findPostToolUseGroup(hooksJson, target);
        expect(entry?.if).toBeTruthy();
        expect(group?.matcher).toBeTruthy();
      }
    });
  });
});
