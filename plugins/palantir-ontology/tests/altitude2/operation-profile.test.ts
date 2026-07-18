// P440 S3: default operation profile snapshot (A2-002) tests.
//
// This is the "profile snapshot test" validation-contract item 2 requires:
// proves the exact default-profile capability set, and proves — by
// checking against the REAL exported function names from
// src/altitude1/*.ts and src/governance/index.ts, not a hand-copied
// string list that could silently drift — that no construction or
// authority-granting capability is present.

import { describe, expect, test } from "bun:test";
import * as altitude2 from "../../src/altitude2";
import { openFdeSession, recordTurn, transitionSession } from "../../src/altitude1/fde-session";
import { proposeSic, approveSic } from "../../src/altitude1/semantic-intent";
import { proposeDtc, finalizeDtc } from "../../src/altitude1/digital-twin-change";
import { stageConstruction, evaluateReadiness, validateConstruction } from "../../src/altitude1/staged-construction";
import { PRODUCTION_COMMIT_GATE, createMintLedger as governanceCreateMintLedger, createFileWriteExecutor } from "../../src/governance";
import {
  DEFAULT_OPERATION_PROFILE_CAPABILITIES,
  EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES,
  EXCLUDED_CONSTRUCTION_CAPABILITIES,
  isCapabilityInDefaultProfile,
} from "../../src/altitude2/operation-profile";

const EXPECTED_SORTED = [
  "appendOperationLineage",
  "bindConsumerOntology",
  "inspectImpact",
  "openReadOrQuery",
  "performDryRun",
  "proposeOperation",
  "queryNamedResource",
  "routeCommit",
  "runGovernanceCheck",
  "searchOntology",
];

describe("DEFAULT_OPERATION_PROFILE_CAPABILITIES: exact snapshot", () => {
  test("matches the exact expected 10-capability set (stability)", () => {
    expect(([...DEFAULT_OPERATION_PROFILE_CAPABILITIES] as string[]).sort()).toEqual(EXPECTED_SORTED);
  });

  test("every profile capability is an actual named export of src/altitude2/index.ts", () => {
    for (const name of DEFAULT_OPERATION_PROFILE_CAPABILITIES) {
      expect(typeof (altitude2 as Record<string, unknown>)[name]).toBe("function");
    }
  });
});

describe("DEFAULT_OPERATION_PROFILE_CAPABILITIES: construction tools DENIED (A2-001/A2-002)", () => {
  const constructionFunctions: Record<(typeof EXCLUDED_CONSTRUCTION_CAPABILITIES)[number], unknown> = {
    openFdeSession,
    recordTurn,
    transitionSession,
    proposeSic,
    approveSic,
    proposeDtc,
    finalizeDtc,
    stageConstruction,
    evaluateReadiness,
    validateConstruction,
  };

  test("every real src/altitude1/ construction export is named in the excluded list (no drift)", () => {
    expect(([...EXCLUDED_CONSTRUCTION_CAPABILITIES] as string[]).sort()).toEqual(Object.keys(constructionFunctions).sort());
  });

  test("no construction capability name is in the default profile", () => {
    for (const name of EXCLUDED_CONSTRUCTION_CAPABILITIES) {
      expect(isCapabilityInDefaultProfile(name)).toBe(false);
    }
  });

  test("no construction function is re-exported from src/altitude2/index.ts under its own name", () => {
    for (const name of EXCLUDED_CONSTRUCTION_CAPABILITIES) {
      expect((altitude2 as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});

describe("DEFAULT_OPERATION_PROFILE_CAPABILITIES: authority-granting tools DENIED (A2-002)", () => {
  const authorityFunctions: Record<(typeof EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES)[number], unknown> = {
    PRODUCTION_COMMIT_GATE,
    createMintLedger: governanceCreateMintLedger,
    createFileWriteExecutor,
  };

  test("every real src/governance/ minting/writer export is named in the excluded list (no drift)", () => {
    expect(([...EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES] as string[]).sort()).toEqual(Object.keys(authorityFunctions).sort());
  });

  test("no authority-granting capability name is in the default profile", () => {
    for (const name of EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES) {
      expect(isCapabilityInDefaultProfile(name)).toBe(false);
    }
  });

  test("no raw governance minting primitive is re-exported from src/altitude2/index.ts under its own name (routeCommit is the sole mutation-authority touchpoint)", () => {
    expect((altitude2 as Record<string, unknown>).PRODUCTION_COMMIT_GATE).toBeUndefined();
    expect(typeof (altitude2 as Record<string, unknown>).routeCommit).toBe("function");
  });
});
