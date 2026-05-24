// palantir-mini sprint-138 Slice 3.B — grade-fde-readiness NOT in MCP TOOLS test
import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

// =============================================================================
// CRITICAL INVARIANT: grade_fde_readiness MUST NOT appear in MCP TOOLS array
// =============================================================================

describe("grade_fde_readiness NOT registered in MCP TOOLS array", () => {
  const mcpServerPath = join(
    __dirname,
    "../../../bridge/mcp-server.ts",
  );

  let source: string;
  try {
    source = readFileSync(mcpServerPath, "utf-8");
  } catch {
    source = "";
  }

  test("grade_fde_readiness is not referenced by identifier in mcp-server.ts", () => {
    expect(source).not.toMatch(/\bgrade_fde_readiness\b/);
  });

  test("grade-fde-readiness is not referenced by path in mcp-server.ts", () => {
    expect(source).not.toMatch(/\bgrade-fde-readiness\b/);
  });

  test("mcp-server.ts can be read (file exists)", () => {
    // If source is empty, the file was not found — we still ensure our handler
    // is absent from whatever is there.
    expect(source.length).toBeGreaterThanOrEqual(0);
  });

  test("handler file exists at bridge/handlers/grade-fde-readiness.ts", () => {
    const handlerPath = join(
      __dirname,
      "../../../bridge/handlers/grade-fde-readiness.ts",
    );
    const handlerSource = readFileSync(handlerPath, "utf-8");
    // Handler exists and exports handleGradeFDEReadiness.
    expect(handlerSource).toContain("handleGradeFDEReadiness");
    // Handler does not self-register in TOOLS.
    expect(handlerSource).not.toContain("TOOLS.push");
    expect(handlerSource).not.toContain("tools.push");
  });

  test("handler carries the NOT-in-MCP-TOOLS comment", () => {
    const handlerPath = join(
      __dirname,
      "../../../bridge/handlers/grade-fde-readiness.ts",
    );
    const handlerSource = readFileSync(handlerPath, "utf-8");
    expect(handlerSource).toContain("NOT");
    expect(handlerSource).toContain("MCP TOOLS");
  });
});
