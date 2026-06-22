import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { classifyHookTimeout } from "../../../lib/hooks/timeout-policy";

describe("hook timeout policy", () => {
  test("classifies timeout families used by lifecycle hooks", () => {
    expect(classifyHookTimeout({
      event: "UserPromptSubmit",
      command: "bun run hooks/prompt-front-door-capture.ts",
      timeoutSeconds: 8,
    }).policy).toBe("front-door");
    expect(classifyHookTimeout({
      event: "PreCompact",
      command: "bun run hooks/pre-compact-state.ts",
      timeoutSeconds: 20,
    }).policy).toBe("compact");
    expect(classifyHookTimeout({
      event: "Stop",
      command: "bun run hooks/stop-validate.ts",
      timeoutSeconds: 10,
    }).policy).toBe("stop");
    expect(classifyHookTimeout({
      event: "PostToolUse",
      command: "bun run hooks/quick.ts",
      timeoutSeconds: 3,
    }).policy).toBe("fast");
    expect(classifyHookTimeout({
      event: "SessionStart",
      command: "bun run hooks/run.ts pm_plugin_self_check",
      timeoutSeconds: 60,
    }).policy).toBe("heavy-audit-forbidden");
  });

  test("uses the expanded hook timeout fallback when no explicit timeout is registered", () => {
    expect(classifyHookTimeout({
      event: "PostToolUse",
      command: "bun run hooks/post-tool-use.ts",
    }).timeoutMs).toBe(3000_000);
  });

  test("current hooks.json does not register heavy broad audit commands", () => {
    const hooksJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "hooks", "hooks.json"), "utf8"),
    ) as { hooks?: Record<string, Array<{ hooks?: Array<{ command?: string; timeout?: number }> }>> };
    const classifications = Object.entries(hooksJson.hooks ?? {}).flatMap(([event, groups]) =>
      groups.flatMap((group) =>
        (group.hooks ?? [])
          .filter((hook) => typeof hook.command === "string")
          .map((hook) => classifyHookTimeout({
            event,
            command: hook.command!,
            timeoutSeconds: hook.timeout,
          })),
      ),
    );

    expect(classifications.length).toBe(45);
    expect(classifications.filter((entry) => entry.policy === "heavy-audit-forbidden")).toEqual([]);
  });
});
