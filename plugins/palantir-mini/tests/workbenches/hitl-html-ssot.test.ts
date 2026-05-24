import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "..", "..");
const WORKBENCH_ROOT = path.join(PLUGIN_ROOT, "workbenches", "hitl-lead-feedback");

function read(relPath: string): string {
  return fs.readFileSync(path.join(WORKBENCH_ROOT, relPath), "utf8");
}

interface RequiredSource {
  sourceId: string;
  url: string;
  sourceKind: string;
  captureStatus: "complete" | "blocked";
  rawRef: string | null;
  renderedDomSnapshotRef: string | null;
  screenshotRef: string | null;
  imageInventoryRef: string | null;
  claimMapRef: string | null;
  blockedReason?: string;
  missingEvidence?: string[];
  exampleCount?: number;
  exampleUrls?: string[];
  provenance: {
    lastDirectAttempt: string;
    methods: string[];
    status: string;
    hash: string | null;
  };
}

interface Manifest {
  schemaVersion: string;
  readiness: string;
  requiredEvidencePerSource: string[];
  sources: RequiredSource[];
}

function manifest(): Manifest {
  return JSON.parse(read("sources/required-sources.json")) as Manifest;
}

describe("HITL HTML SSoT", () => {
  test("defines an explicit HTML request gate and default no-HTML behavior", () => {
    const browse = read("BROWSE.md");
    const recipes = read("templates/html-artifact-recipes.md");
    const skill = fs.readFileSync(
      path.join(PLUGIN_ROOT, "skills", "pm-hitl-feedback-workbench", "SKILL.md"),
      "utf8",
    );

    expect(browse).toContain("Default behavior is no HTML.");
    expect(browse).toContain("Create HTML only when");
    expect(browse).toContain("If HTML would be useful but was not requested");
    expect(recipes).toContain("explicitHtmlRequested: true");
    expect(recipes).toContain("If `explicitHtmlRequested` is false");
    expect(skill).toContain("Do not create HTML unless the user explicitly requested");
  });

  test("requires the source policy evidence classes from the plan", () => {
    const policy = read("SOURCE_POLICY.md");

    for (const primitive of [
      "HITLHtmlEvidenceSource",
      "HITLHtmlInteractionPattern",
      "HITLHtmlVisualGuideline",
      "HITLHtmlArtifactRecipe",
      "HITLHtmlRequestGate",
    ]) {
      expect(policy).toContain(primitive);
    }

    for (const evidenceClass of [
      "Raw text or HTML",
      "Rendered DOM",
      "Full-page screenshot",
      "Image inventory",
      "Claim map",
      "Provenance",
    ]) {
      expect(policy).toContain(evidenceClass);
    }

    expect(policy).toContain("If any required evidence class is missing");
    expect(policy).toContain("Third-party mirrors");
  });

  test("tracks every required source and blocks incomplete direct captures", () => {
    const data = manifest();
    const ids = new Set(data.sources.map((source) => source.sourceId));

    for (const requiredId of [
      "trq212-2052809885763747935",
      "trq212-2017024445244924382",
      "trq212-2024574133011673516",
      "trq212-2027463795355095314",
      "trq212-2044548257058328723",
      "claude-html-blog",
      "html-effectiveness-companion-examples",
      "anthropic-claude-opus-4-7",
      "openai-gpt-5-5-latest-model",
      "microsoft-magentic-ui",
      "apple-designer-feedback",
      "duetui",
      "copilotkit-generative-ui-spectrum",
      "vercel-generative-ui",
      "nng-usability-heuristics",
      "wcag-2-2",
      "material-color-accessibility",
      "govuk-styles",
      "apple-hig",
    ]) {
      expect(ids.has(requiredId)).toBe(true);
    }

    expect(data.requiredEvidencePerSource).toEqual([
      "rawRef",
      "renderedDomSnapshotRef",
      "screenshotRef",
      "imageInventoryRef",
      "claimMapRef",
      "provenance.hash",
    ]);

    for (const source of data.sources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.sourceKind.length).toBeGreaterThan(0);
      expect(source.provenance.lastDirectAttempt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.provenance.methods.length).toBeGreaterThan(0);

      if (source.captureStatus === "complete") {
        expect(source.rawRef).toBeTruthy();
        expect(source.renderedDomSnapshotRef).toBeTruthy();
        expect(source.screenshotRef).toBeTruthy();
        expect(source.imageInventoryRef).toBeTruthy();
        expect(source.claimMapRef).toBeTruthy();
        expect(source.provenance.hash).toBeTruthy();
      } else {
        expect(source.blockedReason?.length ?? 0).toBeGreaterThan(20);
        expect(source.missingEvidence?.length ?? 0).toBeGreaterThan(0);
      }
    }

    expect(data.readiness).toBe("blocked_until_complete_direct_capture");
  });

  test("registers all 20 companion HTML examples", () => {
    const examples = manifest().sources.find(
      (source) => source.sourceId === "html-effectiveness-companion-examples",
    );

    expect(examples).toBeDefined();
    expect(examples!.exampleCount).toBe(20);
    expect(examples!.exampleUrls).toHaveLength(20);
    for (const url of examples!.exampleUrls ?? []) {
      expect(url).toMatch(/^https:\/\/thariqs\.github\.io\/html-effectiveness\/.+\.html$/);
    }
  });

  test("defines the nine pattern taxonomy entries and artifact order", () => {
    const taxonomy = read("patterns/html-hitl-pattern-taxonomy.md");
    const index = read("INDEX.md").toLowerCase();

    for (const patternId of [
      "task-framing-canvas",
      "side-by-side-option-board",
      "plan-progress-stream",
      "autonomy-control-panel",
      "confirmation-gate-rollback-receipt",
      "evidence-map",
      "direct-manipulation-sandbox",
      "generated-dashboard-report",
      "handoff-packet",
    ]) {
      expect(taxonomy).toContain(patternId);
    }

    for (const indexName of [
      "task framing canvas",
      "side-by-side option board",
      "plan surface + progress stream",
      "autonomy control panel",
      "confirmation gate + rollback receipt",
      "evidence map",
      "direct manipulation sandbox",
      "generated dashboard/report",
      "handoff packet",
    ]) {
      expect(index).toContain(indexName);
    }

    for (const requiredOrder of [
      "Plain summary",
      "Decision surface",
      "Evidence",
      "Export prompt",
    ]) {
      expect(taxonomy).toContain(requiredOrder);
    }

    expect(taxonomy).toContain("Status cannot be represented by color alone.");
  });

  test("requires artifact metadata and blocked reports instead of placeholder HTML", () => {
    const recipes = read("templates/html-artifact-recipes.md");

    expect(recipes).toContain("id=\"hitl-html-metadata\"");
    expect(recipes).toContain("\"selectedPattern\"");
    expect(recipes).toContain("\"sourceRefs\"");
    expect(recipes).toContain("Do not cite a blocked source as passing evidence.");
    expect(recipes).toContain("Blocked reports are text or review-card artifacts");
  });
});
