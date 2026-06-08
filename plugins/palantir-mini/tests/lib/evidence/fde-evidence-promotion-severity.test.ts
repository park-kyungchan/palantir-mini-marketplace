import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG,
  evaluateFDEEvidencePromotionSeverity,
} from "../../../lib/evidence/evidence-source-policy";

function makeProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-evidence-severity-"));
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "source.md"), "# source\n");
  return root;
}

describe("FDE evidence promotion severity", () => {
  test("early reference-only evidence is not noisy before authority use", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "entry-intent",
        use: "reference",
      });

      expect(decision.policyDecision.allowed).toBe(true);
      expect(decision.policyDecision.ssotStatus).toBe("not_promoted");
      expect(decision.severity).toBe("none");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("evidence-definition reference-only evidence remains non-blocking", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "evidence-definition",
        use: "reference",
      });

      expect(decision.severity).toBe("none");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("semantic-contract-ready warns for unpromoted evidence", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "semantic-contract-ready",
        use: "reference",
      });

      expect(decision.severity).toBe("warn");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("semantic-contract-ready authority use warns before DTC approval", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "semantic-contract-ready",
        use: "authority",
      });

      expect(decision.severity).toBe("warn");
      expect(decision.reason).toContain("authority");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("dtc-ready authority evidence fails without a promotion ledger entry", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "dtc-ready",
        use: "authority",
      });

      expect(decision.severity).toBe("fail");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("mutation use fails without a promotion ledger entry", () => {
    const root = makeProject();
    try {
      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "mutation",
        use: "mutation",
      });

      expect(decision.severity).toBe("fail");
      expect(decision.reason).toContain("Mutation-phase");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("scoped promotion ledger clears authority warnings", () => {
    const root = makeProject();
    try {
      fs.mkdirSync(path.join(root, ".palantir-mini", "evidence"), { recursive: true });
      fs.writeFileSync(
        path.join(root, ".palantir-mini", "evidence", "promotions.json"),
        JSON.stringify({
          schemaVersion: "palantir-mini/evidence-promotions/v1",
          promotions: [
            {
              sourcePath: "docs/source.md",
              scope: "project",
              target: "project ontology",
              approvedContractRef: "digital-twin-change:approved",
              timestamp: "2026-05-21T00:00:00.000Z",
              stillReferenceOnlyOutsideScope: true,
            },
          ],
        }),
      );

      const decision = evaluateFDEEvidencePromotionSeverity({
        projectRoot: root,
        sourcePath: "./docs/source.md",
        phase: "dtc-ready",
        use: "authority",
      });

      expect(decision.policyDecision.ssotStatus).toBe("promoted_project_scope");
      expect(decision.severity).toBe("none");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  describe("injectable config", () => {
    test("omitting config equals passing the exported default config", () => {
      const root = makeProject();
      try {
        const input = {
          projectRoot: root,
          sourcePath: "./docs/source.md",
          phase: "dtc-ready" as const,
          use: "authority" as const,
        };
        const withoutConfig = evaluateFDEEvidencePromotionSeverity(input);
        const withDefault = evaluateFDEEvidencePromotionSeverity(
          input,
          DEFAULT_EVIDENCE_SOURCE_POLICY_CONFIG,
        );

        expect(withDefault).toEqual(withoutConfig);
        expect(withoutConfig.severity).toBe("fail");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    test("custom projectDocSegments flow through to the policy decision", () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-fde-evidence-cfg-"));
      try {
        fs.mkdirSync(path.join(root, "handbook"), { recursive: true });
        fs.writeFileSync(path.join(root, "handbook", "source.md"), "# source\n");

        // Default config does not treat "handbook/" as project docs -> unsupported.
        const withDefault = evaluateFDEEvidencePromotionSeverity({
          projectRoot: root,
          sourcePath: "./handbook/source.md",
          phase: "dtc-ready",
          use: "authority",
        });
        expect(withDefault.policyDecision.allowed).toBe(false);
        expect(withDefault.severity).toBe("none");

        // Injected segment list makes "handbook/" a recognised project doc -> authority fails.
        const withCustom = evaluateFDEEvidencePromotionSeverity(
          {
            projectRoot: root,
            sourcePath: "./handbook/source.md",
            phase: "dtc-ready",
            use: "authority",
          },
          { projectDocSegments: ["handbook"] },
        );
        expect(withCustom.policyDecision.allowed).toBe(true);
        expect(withCustom.policyDecision.kind).toBe("project-doc");
        expect(withCustom.severity).toBe("fail");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
