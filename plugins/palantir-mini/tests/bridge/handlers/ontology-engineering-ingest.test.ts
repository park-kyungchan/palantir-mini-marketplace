// palantir-mini — `ingest` seam test (jsonl SOURCE → session candidates).
//
// PROVES the INGESTION ADAPTER: a frozen NC1 SOURCE jsonl (one record per line,
// discriminated by kg_layer ∈ {DATA,LOGIC,ACTION,GOVERNANCE,EDGE}) →
// parseJsonlSourceToCandidateArrays (PURE) → the five FDE session candidate
// arrays, with edges resolved by atom name and unresolvable/null-kind edges
// skipped-and-reported. Then the session-integrating wrapper persists a readable
// session. Bonus: the full mini-loop ingest → approved+graded → register →
// READABLE in get_ontology.registeredPrimitives.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { handleOntologyEngineeringWorkflow } from "../../../bridge/handlers/pm-ontology-engineering-workflow";
import getOntology from "../../../bridge/handlers/get-ontology";
import {
  ingestJsonlSourceToCandidates,
  parseJsonlSourceToCandidateArrays,
} from "../../../lib/fde-ontology-engineering/source-ingest";
import { readCurrentFDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/session-store";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";

const tmpRoots: string[] = [];
const tmpFiles: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-ingest-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

/**
 * 7-record SOURCE fixture covering all 5 kg_layers:
 *   2×DATA (학생, 강의 — both objects so the resolving edge is object→object and
 *   therefore registerable), LOGIC, ACTION, GOVERNANCE, plus 2 EDGE records —
 *   one whose endpoints resolve to seeded object atoms, one with a dangling
 *   target + null edge_kind (skips).
 */
function writeFixture(): string {
  const records = [
    {
      kg_layer: "DATA",
      record_type: "kg_linear_function_data_atom_candidate",
      candidate_id: "lfa-dt-001",
      label_ko: "학생",
      description_ko: "선형함수를 학습하는 학습자",
      atom_kind: "entity",
      source_basis_refs: ["ref:student-1"],
    },
    {
      kg_layer: "DATA",
      record_type: "kg_linear_function_data_atom_candidate",
      candidate_id: "lfa-dt-002",
      label_ko: "강의",
      description_ko: "선형함수 강의 단위",
      atom_kind: "entity",
      source_basis_refs: ["ref:lesson-1"],
    },
    {
      kg_layer: "LOGIC",
      record_type: "kg_linear_function_logic_atom_candidate",
      candidate_id: "lfa-lg-010",
      label_ko: "기울기 계산",
      description_ko: "두 점으로 기울기를 계산한다",
      logic_kind: "computation",
      source_basis_refs: ["ref:slope-1"],
    },
    {
      kg_layer: "ACTION",
      record_type: "kg_linear_function_action_atom_candidate",
      candidate_id: "lfa-ac-020",
      label_ko: "진도 기록",
      description_ko: "학생의 진도를 기록한다",
      action_kind: "writeback",
      source_basis_refs: ["ref:progress-1"],
    },
    {
      kg_layer: "GOVERNANCE",
      record_type: "kg_linear_function_gov_atom_candidate",
      candidate_id: "lfa-gv-030",
      label_ko: "교사 역할",
      description_ko: "교사는 진도를 기록할 수 있다",
      role_kind: "teacher",
      governed_action_policy: "may-record-progress",
    },
    {
      // RESOLVES (object→object): source=학생(lfa-dt-001), target=강의(lfa-dt-002)
      kg_layer: "EDGE",
      record_type: "kg_linear_function_composition_edge_candidate",
      candidate_id: "lfe-001",
      source_candidate_id: "lfa-dt-001",
      target_candidate_id: "lfa-dt-002",
      edge_kind: "requires",
    },
    {
      // SKIPS: dangling target + null edge_kind
      kg_layer: "EDGE",
      record_type: "kg_linear_function_composition_edge_candidate",
      candidate_id: "lfe-002",
      source_candidate_id: "lfa-dt-001",
      target_candidate_id: "lfa-does-not-exist",
      edge_kind: null,
    },
  ];
  const file = path.join(os.tmpdir(), `pm-ingest-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  tmpFiles.push(file);
  return file;
}

describe("ingest seam — jsonl SOURCE → session candidate arrays", () => {
  test("parseJsonlSourceToCandidateArrays maps each layer + resolves/skips edges", () => {
    const fixture = writeFixture();
    const parsed = parseJsonlSourceToCandidateArrays(fixture);

    expect(parsed.objectCandidates).toHaveLength(2);
    expect(parsed.objectCandidates.map((c) => c.plainName)).toContain("학생");
    expect(parsed.objectCandidates.map((c) => c.plainName)).toContain("강의");
    expect(parsed.objectCandidates[0]!.evidenceRefs.length).toBeGreaterThan(0);

    expect(parsed.functionCandidates).toHaveLength(1);
    expect(parsed.functionCandidates[0]!.plainName).toBe("기울기 계산");

    expect(parsed.actionCandidates).toHaveLength(1);
    expect(parsed.actionCandidates[0]!.plainName).toBe("진도 기록");
    expect(parsed.actionCandidates[0]!.writebackRisk).toBe("none");

    expect(parsed.roleCandidates).toHaveLength(1);
    expect(parsed.roleCandidates[0]!.plainName).toBe("교사 역할");
    expect(parsed.roleCandidates[0]!.permissions).toEqual(["may-record-progress"]);

    // one edge RESOLVES → linkCandidate whose endpoints are the atom label_ko names
    expect(parsed.linkCandidates).toHaveLength(1);
    expect(parsed.linkCandidates[0]!.plainName).toBe("requires");
    expect(parsed.linkCandidates[0]!.sourceObject).toBe("학생");
    expect(parsed.linkCandidates[0]!.targetObject).toBe("강의");

    // one edge SKIPS (dangling target + null edge_kind)
    expect(parsed.skipped.edges).toHaveLength(1);
    expect(parsed.skipped.edges[0]!.candidateId).toBe("lfe-002");
    expect(parsed.skipped.edges[0]!.reason).toContain("edge_kind");
    expect(parsed.skipped.edges[0]!.reason).toContain("lfa-does-not-exist");

    // all 6 records were well-formed → no record-level skips
    expect(parsed.skipped.records).toHaveLength(0);
  });

  test("ingestJsonlSourceToCandidates persists a readable session with the candidate arrays", () => {
    const P = setupRoot("persist");
    const fixture = writeFixture();

    const result = ingestJsonlSourceToCandidates({ sourceJsonlPath: fixture, projectRoot: P });

    expect(result.counts).toEqual({ objects: 2, functions: 1, actions: 1, roles: 1, links: 1 });
    expect(result.skipped.edges).toHaveLength(1);

    const persisted = readCurrentFDEOntologyEngineeringSession(P);
    expect(persisted).not.toBeNull();
    expect(persisted!.objectCandidates).toHaveLength(2);
    expect(persisted!.functionCandidates).toHaveLength(1);
    expect(persisted!.actionCandidates).toHaveLength(1);
    expect(persisted!.roleCandidates ?? []).toHaveLength(1);
    expect(persisted!.linkCandidates).toHaveLength(1);
    expect(persisted!.objectCandidates[0]!.plainName).toBe("학생");
  });

  test("via handler: action:'ingest' returns counts + skipped and persists the session", async () => {
    const P = setupRoot("handler");
    const fixture = writeFixture();

    const result = await handleOntologyEngineeringWorkflow({
      action: "ingest",
      project: P,
      sourceJsonlPath: fixture,
    });

    expect(result.ingest?.counts).toEqual({ objects: 2, functions: 1, actions: 1, roles: 1, links: 1 });
    expect(result.ingest?.skipped.edges).toHaveLength(1);
    expect(result.session?.objectCandidates).toHaveLength(2);
  });

  test("full mini-loop: ingest → approved+graded register → READABLE primitives", async () => {
    const P = setupRoot("loop");
    const fixture = writeFixture();

    // 1) ingest the SOURCE
    const ingestResult = await handleOntologyEngineeringWorkflow({
      action: "ingest",
      project: P,
      sourceJsonlPath: fixture,
    });
    const sessionId = ingestResult.session!.sessionId;

    // 2) bring the session to dtc-ready + graded so the register gate passes.
    //    (Re-use the persisted candidate arrays; only set the grade + phase.)
    const session = readCurrentFDEOntologyEngineeringSession(P)!;
    const graded = {
      ...session,
      phase: "dtc-ready" as const,
      readinessProfileId: "mission-decision" as const,
      readinessProfile: {
        profileId: "mission-decision" as const,
        score: 1,
        readyForSemanticIntent: true,
        readyForDigitalTwin: true,
        requirementResults: [],
        missingRequired: [],
        warnings: [],
      },
    };
    const { writeFDEOntologyEngineeringSessionSnapshot } = await import(
      "../../../lib/fde-ontology-engineering/session-store"
    );
    writeFDEOntologyEngineeringSessionSnapshot(graded);

    // 3) register with an approved SIC + DTC
    const reg = await handleOntologyEngineeringWorkflow({
      action: "register",
      project: P,
      sessionId,
      semanticIntentContractRef: "sic:approved-1",
      semanticIntentContractStatus: "approved",
      digitalTwinChangeContractRef: "dtc:approved-1",
      digitalTwinChangeContractStatus: "approved",
    });
    expect(reg.register?.committed).toBe(true);

    const objRid = projectPrimitiveRid(P, "object-type", "학생");
    const fnRid = projectPrimitiveRid(P, "function", "기울기 계산");
    const actRid = projectPrimitiveRid(P, "action-type", "진도 기록");
    const roleRid = projectPrimitiveRid(P, "role", "교사 역할");
    const linkRid = projectPrimitiveRid(P, "link-type", "requires");

    const snap = (await getOntology({ project: P })).snapshot.registeredPrimitives!;
    expect(snap.objectTypes).toContain(objRid);
    expect(snap.functions).toContain(fnRid);
    expect(snap.actionTypes).toContain(actRid);
    expect(snap.roles).toContain(roleRid);
    expect(snap.linkTypes).toContain(linkRid);
  });
});
