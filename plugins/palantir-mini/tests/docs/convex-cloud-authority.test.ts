/**
 * sprint-134 PR 6.7 — Convex Cloud authority doc invariant tests.
 * Verifies docs/CONVEX_CLOUD_AUTHORITY.md and .ssot-authority.json
 * meet the canonical requirements from canonical plan v2 §4 row 6.7.
 */

import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

describe("convex-cloud-authority docs", () => {
  const authorityDocPath = path.join(PLUGIN_ROOT, "docs/CONVEX_CLOUD_AUTHORITY.md");
  const ssotJsonPath = path.join(PLUGIN_ROOT, ".ssot-authority.json");

  it("CONVEX_CLOUD_AUTHORITY.md exists", () => {
    expect(fs.existsSync(authorityDocPath)).toBe(true);
  });

  it("CONVEX_CLOUD_AUTHORITY.md contains Cloud-vs-local table", () => {
    const content = fs.readFileSync(authorityDocPath, "utf-8");
    expect(content).toContain("effervescent-meerkat-169");
    expect(content).toContain("127.0.0.1:3210");
  });

  it("CONVEX_CLOUD_AUTHORITY.md mentions R1 invariant", () => {
    const content = fs.readFileSync(authorityDocPath, "utf-8");
    expect(content).toContain("R1");
    expect(content).toContain("local");
  });

  it("CONVEX_CLOUD_AUTHORITY.md mentions R2 invariant", () => {
    const content = fs.readFileSync(authorityDocPath, "utf-8");
    expect(content).toContain("R2");
    expect(content).toContain("STUB MODE");
  });

  it("CONVEX_CLOUD_AUTHORITY.md mentions R3 invariant", () => {
    const content = fs.readFileSync(authorityDocPath, "utf-8");
    expect(content).toContain("R3");
    // R3 prohibits Agent/RAG components
    expect(content).toContain("NO Convex Agent");
  });

  it(".ssot-authority.json exists", () => {
    expect(fs.existsSync(ssotJsonPath)).toBe(true);
  });

  it(".ssot-authority.json dataLayer.primary exists and matches expected pattern", () => {
    const raw = fs.readFileSync(ssotJsonPath, "utf-8");
    const json = JSON.parse(raw);
    expect(json).toHaveProperty("dataLayer");
    expect(json.dataLayer).toHaveProperty("primary");
    expect(json.dataLayer.primary).toContain("effervescent-meerkat-169");
  });

  it(".ssot-authority.json dataLayer.fallback references local self-hosted address", () => {
    const raw = fs.readFileSync(ssotJsonPath, "utf-8");
    const json = JSON.parse(raw);
    expect(json.dataLayer).toHaveProperty("fallback");
    expect(json.dataLayer.fallback).toContain("127.0.0.1");
  });

  it(".ssot-authority.json dataLayer.asOf is present", () => {
    const raw = fs.readFileSync(ssotJsonPath, "utf-8");
    const json = JSON.parse(raw);
    expect(json.dataLayer).toHaveProperty("asOf");
    expect(typeof json.dataLayer.asOf).toBe("string");
  });

  it("SSOT-AUTHORITY.md references CONVEX_CLOUD_AUTHORITY.md", () => {
    const ssotMdPath = path.join(PLUGIN_ROOT, "SSOT-AUTHORITY.md");
    const content = fs.readFileSync(ssotMdPath, "utf-8");
    expect(content).toContain("CONVEX_CLOUD_AUTHORITY.md");
  });
});
