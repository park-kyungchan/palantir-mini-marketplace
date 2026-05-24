/**
 * sprint-100 PR 4.1a — Convex Cloud cutover doc invariant tests.
 * Verifies docs/CONVEX_CLOUD_CUTOVER.md and convex/.env.cloud.example
 * meet the canonical requirements from handoff §E.2.
 */

import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

describe("convex-cloud-cutover docs", () => {
  const cutoverDocPath = path.join(PLUGIN_ROOT, "docs/CONVEX_CLOUD_CUTOVER.md");
  const exampleEnvPath = path.join(PLUGIN_ROOT, "convex/.env.cloud.example");

  it("CONVEX_CLOUD_CUTOVER.md exists", () => {
    expect(fs.existsSync(cutoverDocPath)).toBe(true);
  });

  it("CONVEX_CLOUD_CUTOVER.md mentions R1 invariant", () => {
    const content = fs.readFileSync(cutoverDocPath, "utf-8");
    expect(content).toContain("R1");
    expect(content).toContain("Local default");
  });

  it("CONVEX_CLOUD_CUTOVER.md mentions R2 invariant", () => {
    const content = fs.readFileSync(cutoverDocPath, "utf-8");
    expect(content).toContain("R2");
    expect(content).toContain("STUB MODE");
  });

  it("CONVEX_CLOUD_CUTOVER.md mentions R3 invariant", () => {
    const content = fs.readFileSync(cutoverDocPath, "utf-8");
    expect(content).toContain("R3");
    expect(content).toContain("No Convex Agent");
  });

  it("CONVEX_CLOUD_CUTOVER.md references effervescent-meerkat-169", () => {
    const content = fs.readFileSync(cutoverDocPath, "utf-8");
    expect(content).toContain("effervescent-meerkat-169");
  });

  it("CONVEX_CLOUD_CUTOVER.md contains cutover env-var / switch instructions", () => {
    const content = fs.readFileSync(cutoverDocPath, "utf-8");
    // Must have either CONVEX_ENV=cloud or bunx convex deploy instructions
    const hasEnvVar = content.includes("CONVEX_ENV=cloud") || content.includes("--env-file");
    expect(hasEnvVar).toBe(true);
  });

  it(".env.cloud.example exists", () => {
    expect(fs.existsSync(exampleEnvPath)).toBe(true);
  });

  it(".env.cloud.example has CONVEX_DEPLOYMENT line", () => {
    const content = fs.readFileSync(exampleEnvPath, "utf-8");
    expect(content).toContain("CONVEX_DEPLOYMENT=dev:effervescent-meerkat-169");
  });

  it(".env.cloud.example has CONVEX_URL line", () => {
    const content = fs.readFileSync(exampleEnvPath, "utf-8");
    expect(content).toContain("CONVEX_URL=https://effervescent-meerkat-169.convex.cloud");
  });

  it(".env.cloud.example has placeholder CONVEX_DEPLOY_KEY (NOT the real key)", () => {
    const content = fs.readFileSync(exampleEnvPath, "utf-8");
    expect(content).toContain("CONVEX_DEPLOY_KEY=");
    // Must NOT contain the real key
    expect(content).not.toContain("eyJ2MiI6IjlmM2JmNDQzOTNjMDRmNTQ5Y2I1YTIyNTZlNmYwYmY5In0=");
    // Must contain a placeholder indicator
    expect(content).toContain("<paste-from-convex-dashboard>");
  });
});
