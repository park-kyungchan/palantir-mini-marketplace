import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  CURRICULUM_V2_SCHEMA_VERSION,
  loadCurriculumContextPacks,
} from "../../../lib/education/curriculum-context-pack";
import { queryCurriculumContext } from "../../../lib/education/curriculum-context-query";

function withTempProject<T>(fn: (projectRoot: string) => T): T {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-curriculum-context-"));
  try {
    return fn(projectRoot);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}

function writeFixturePack(projectRoot: string): string {
  const packRoot = path.join(
    projectRoot,
    "docs",
    "2022-math-curriculum",
    "agent-ready",
    "ontology-engineering",
    "v2",
  );

  writeJsonl(path.join(packRoot, "objects.jsonl"), [
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      object_id: "fixture.object.quadratic",
      collection_id: "fixture.curriculum",
      object_type: "achievement_standard",
      title: "Quadratic functions",
      language: "en",
      native_id: "QF-1",
      native_label: "Quadratic function standard",
      display_text: "Students model and interpret quadratic functions.",
      normalized_text: "Model quadratic functions and compare intercepts.",
      source_span_refs: ["fixture.span.quadratic"],
      trust: {
        authority_tier: "official_source",
        confidence: 0.9,
        human_review_status: "not_reviewed",
        defect_refs: [],
      },
      tags: ["high", "algebra", "quadratic-functions"],
      related_object_ids: ["fixture.object.linear"],
      v1_unit_ref: {
        unit_id: "fixture.v1.quadratic",
        unit_type: "achievement_standard",
        card_path: "docs/2022-math-curriculum/cards/quadratic.md",
      },
      facets: {
        grade_band: "high",
        course: "algebra",
        concept: ["quadratic-functions"],
        command_verb: "model",
        criterion: null,
        source_authority: ["official_source"],
        qa_risk: [],
      },
    },
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      object_id: "fixture.object.probability",
      collection_id: "fixture.curriculum",
      object_type: "achievement_standard",
      title: "Probability",
      language: "en",
      display_text: "Students calculate probability.",
      normalized_text: "Probability and counting.",
      source_span_refs: ["fixture.span.probability"],
      trust: {
        authority_tier: "official_source",
        confidence: 0.9,
        human_review_status: "not_reviewed",
        defect_refs: [],
      },
      tags: ["high", "probability"],
      related_object_ids: [],
      facets: {
        grade_band: "high",
        course: "probability-statistics",
        concept: ["probability"],
        command_verb: "calculate",
        criterion: null,
        source_authority: ["official_source"],
        qa_risk: [],
      },
    },
  ]);

  writeJsonl(path.join(packRoot, "source-spans.jsonl"), [
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      object_id: "fixture.span.quadratic",
      object_type: "SourceSpan",
      collection_id: "fixture.curriculum",
      source_id: "fixture.source",
      source_document: "Fixture curriculum",
      source_path: "docs/source.pdf",
      source_page_start: 12,
      source_page_end: 13,
      derived_path: "docs/2022-math-curriculum/algebra/quadratic.md",
      derived_line_start: 4,
      derived_line_end: 8,
      raw_excerpt_sha256: "sha256:quadratic",
      authority_tier: "official_source",
      screenshot_path: null,
      extraction_notes: [],
    },
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      span_id: "fixture.span.probability",
      collection_id: "fixture.curriculum",
      source_id: "fixture.source",
      source_document: "Fixture curriculum",
      source_path: "docs/source.pdf",
      source_page_start: 20,
      source_page_end: 21,
      derived_path: "docs/2022-math-curriculum/probability.md",
      derived_line_start: 2,
      derived_line_end: 5,
      raw_excerpt_sha256: "sha256:probability",
      authority_tier: "official_source",
      screenshot_path: null,
      extraction_notes: [],
    },
  ]);

  writeJsonl(path.join(packRoot, "retrieval-bundles.jsonl"), [
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      object_id: "fixture.bundle.quadratic-authoring",
      object_type: "RetrievalBundle",
      collection_id: "fixture.curriculum",
      title: "Quadratic authoring bundle",
      purpose: "contract-authoring",
      recommended_questions: ["Which quadratic representation is needed?"],
      candidate_nouns: ["quadratic function", "intercepts"],
      candidate_verbs: ["model", "interpret"],
      non_goal_warnings: ["reference only; do not mutate curriculum"],
      evidence_object_refs: ["fixture.object.quadratic"],
      source_span_refs: ["fixture.span.quadratic"],
      qa_risk_refs: [],
      confidence: 0.88,
      trust: {
        authority_tier: "official_source",
        confidence: 0.88,
        human_review_status: "not_reviewed",
        defect_refs: [],
      },
    },
  ]);

  writeJsonl(path.join(packRoot, "authoring-index.jsonl"), [
    {
      schema_version: CURRICULUM_V2_SCHEMA_VERSION,
      intent_phrase: "Author a quadratic function lesson",
      candidate_nouns: ["quadratic function", "vertex"],
      candidate_verbs: ["model", "compare"],
      candidate_surfaces: ["lesson-design"],
      non_goals: ["do not promote to curriculum authority"],
      evidence_object_refs: ["fixture.object.quadratic"],
      source_span_refs: ["fixture.span.quadratic"],
      confidence: 0.86,
    },
  ]);

  return packRoot;
}

describe("curriculumContext query library", () => {
  test("omits gracefully when no generated v2 packs exist", () => {
    withTempProject((projectRoot) => {
      const loaded = loadCurriculumContextPacks({ projectRoot });
      expect(loaded.packs).toEqual([]);
      expect(
        queryCurriculumContext({
          projectRoot,
          queryTerms: ["quadratic function"],
        }),
      ).toBeUndefined();
    });
  });

  test("loads generated v2 pack rows and returns small query-scoped context", () => {
    withTempProject((projectRoot) => {
      const packRoot = writeFixturePack(projectRoot);

      const loaded = loadCurriculumContextPacks({ projectRoot, packRoots: [packRoot] });
      expect(loaded.packs).toHaveLength(1);
      expect(loaded.packs[0]?.objects).toHaveLength(2);

      const context = queryCurriculumContext({
        projectRoot,
        packRoots: [packRoot],
        queryTerms: ["quadratic function"],
        scopePaths: ["docs/2022-math-curriculum/algebra/quadratic.md"],
        maxObjects: 1,
        includeWarnings: true,
      });

      expect(context).toBeDefined();
      expect(context?.sourceSchemaVersion).toBe(CURRICULUM_V2_SCHEMA_VERSION);
      expect(context?.packCount).toBe(1);
      expect(context?.matchedObjects).toHaveLength(1);
      expect(context?.matchedObjects[0]?.objectId).toBe("fixture.object.quadratic");
      expect(context?.matchedObjects[0]?.excerpt).toContain("quadratic functions");
      expect(context?.retrievalBundles[0]?.bundleId).toBe(
        "fixture.bundle.quadratic-authoring",
      );
      expect(context?.authoringRows[0]?.intentPhrase).toBe(
        "Author a quadratic function lesson",
      );
      expect(context?.sourceSpans.map((span) => span.spanId)).toContain(
        "fixture.span.quadratic",
      );
      expect(context?.warnings).toEqual([]);
    });
  });

  test("derives query terms from scope paths", () => {
    withTempProject((projectRoot) => {
      const packRoot = writeFixturePack(projectRoot);

      const context = queryCurriculumContext({
        projectRoot,
        packRoots: [packRoot],
        scopePaths: ["docs/2022-math-curriculum/algebra/quadratic-functions.md"],
        queryTerms: [],
      });

      expect(context?.queryTerms).toContain("quadratic");
      expect(context?.queryTerms).toContain("functions");
      expect(context?.matchedObjects[0]?.objectId).toBe("fixture.object.quadratic");
    });
  });

  test("malformed pack data never throws and yields omission", () => {
    withTempProject((projectRoot) => {
      const packRoot = path.join(projectRoot, "docs", "bad", "agent-ready", "v2");
      fs.mkdirSync(packRoot, { recursive: true });
      fs.writeFileSync(path.join(packRoot, "objects.jsonl"), "{ not valid json }\n", "utf8");

      expect(() => loadCurriculumContextPacks({ projectRoot, packRoots: [packRoot] })).not.toThrow();
      expect(
        queryCurriculumContext({
          projectRoot,
          packRoots: [packRoot],
          queryTerms: ["quadratic"],
        }),
      ).toBeUndefined();
    });
  });
});
