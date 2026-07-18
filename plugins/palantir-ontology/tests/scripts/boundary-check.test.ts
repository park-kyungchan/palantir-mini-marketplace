// Permanent regression for scripts/boundary-check.ts's pure detection
// logic (P340). Complements the manual bite-proof demonstration recorded
// in outputs/p340-generators-checkers.md — this test keeps the same
// detection surviving as an automated `bun test` check, using string
// inputs only (no scratch files under src/**).

import { describe, expect, test } from "bun:test";
import {
  isAllowedModuleTokenOccurrence,
  isSingleStringLiteralArg,
  resolvesIntoAdapters,
  resolvesIntoGovernanceCommitGate,
  resolvesIntoGovernanceSecurityOracle,
  resolvesIntoGovernanceTesting,
  resolvesIntoGovernanceWriter,
  scanBoundaries,
  stripLineAndBlockComments,
} from "../../scripts/boundary-check";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("boundary-check: resolvesIntoAdapters", () => {
  test("a relative import climbing into src/adapters/** is a violation", () => {
    expect(resolvesIntoAdapters("../adapters/shared/thing", "/pkg/src/semantic-core", "/pkg/src")).toBe(true);
  });

  test("a relative import to a sibling semantic-core module is not a violation", () => {
    expect(resolvesIntoAdapters("../governance/gate", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
  });

  test("a bare package specifier is never treated as src-internal", () => {
    expect(resolvesIntoAdapters("node:fs", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
    expect(resolvesIntoAdapters("some-package", "/pkg/src/semantic-core", "/pkg/src")).toBe(false);
  });

  test("an import from within src/adapters itself to a sibling adapter file is not flagged by this predicate", () => {
    // (scanBoundaries separately skips scanning adapter files entirely — adapters
    // importing adapters, or adapters importing core, is allowed by ADR-002.)
    expect(resolvesIntoAdapters("./codex/x", "/pkg/src/adapters/shared", "/pkg/src")).toBe(true);
  });
});

describe("boundary-check: scanBoundaries against the real current src/ tree", () => {
  test("the current scaffold has zero boundary violations", () => {
    const srcDir = resolve(import.meta.dir, "..", "..", "src");
    const violations = scanBoundaries(srcDir);
    expect(violations).toEqual([]);
  });
});

// P430: ADR-005's "writer primitive must not be exported from a public
// module path any other successor subsystem can import" — the structural
// half of the bypass-census proof (outputs/p430-mutation-authority.md).
describe("boundary-check: resolvesIntoGovernanceWriter", () => {
  test("a relative import reaching src/governance/atomic-write from OUTSIDE governance is a violation", () => {
    expect(resolvesIntoGovernanceWriter("../governance/atomic-write", "/pkg/src/altitude2", "/pkg/src")).toBe(true);
  });

  test("a relative import reaching src/governance/mint-ledger from OUTSIDE governance is a violation", () => {
    expect(resolvesIntoGovernanceWriter("../../governance/mint-ledger", "/pkg/src/adapters/shared", "/pkg/src")).toBe(true);
  });

  test("importing src/governance/index (the sanctioned entry point) is NOT a violation", () => {
    expect(resolvesIntoGovernanceWriter("../governance/index", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
    expect(resolvesIntoGovernanceWriter("../governance", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("importing src/governance/commit-gate (not a writer primitive) is NOT flagged by this predicate", () => {
    expect(resolvesIntoGovernanceWriter("../governance/commit-gate", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("a bare package specifier is never treated as src-internal", () => {
    expect(resolvesIntoGovernanceWriter("node:fs", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });
});

describe("boundary-check: scanBoundaries live-detects a synthetic bypass attempt", () => {
  test("a temp file outside src/governance importing atomic-write directly is caught (method proof: real filesystem scan, not just the pure predicate)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p430-boundary-scan-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "atomic-write.ts"), "export function atomicWriteFile() {}\n");
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'import { atomicWriteFile } from "../governance/atomic-write";\natomicWriteFile();\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toEqual([
        {
          file: "altitude2/bypass-attempt.ts",
          kind: "governance-writer-import",
          detail: 'imports "../governance/atomic-write" — a governance writer primitive reachable only via src/governance/index.ts (ADR-005)',
        },
      ]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P450: ADR-003's `runtimeScope` field fixes literal Codex/Claude/Gemini
// mentions as legitimate control-plane catalog DATA, so `src/control-plane/`
// must be exempt from the runtime-identity-literal rule — but ONLY that one
// rule, and ONLY that one directory. Both halves of the narrowness are
// asserted below: a control-plane file naming a runtime is silent, while
// the exact same content one directory over is still caught.
describe("boundary-check: control-plane runtime-identity exemption is narrow", () => {
  test("a src/control-plane file naming codex/claude/gemini is NOT flagged", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p450-control-plane-exemption-"));
    try {
      mkdirSync(join(scratchSrc, "control-plane"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "control-plane", "types.ts"),
        'export type RuntimeScope = "codex" | "claude" | "gemini" | "all";\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("the identical content one directory OUTSIDE src/control-plane is still flagged (the exemption is directory-scoped, not content-scoped)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p450-control-plane-exemption-negative-"));
    try {
      mkdirSync(join(scratchSrc, "semantic-core"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "semantic-core", "types.ts"),
        'export type RuntimeScope = "codex" | "claude" | "gemini" | "all";\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toEqual([
        {
          file: "semantic-core/types.ts",
          kind: "runtime-identity-literal",
          detail: 'contains runtime-identity literal "codex" (ADR-002: no branching on runtime identity outside src/adapters/**)',
        },
      ]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P460 FIX 3 (decisions/pm2-core-safety-correction.md): the control-plane
// runtime-identity-LITERAL exemption above stays exactly as narrow as
// P450 left it — but a runtime-identity literal used as a branching
// CONDITION (comparison/if/switch/case/ternary) inside src/control-plane/**
// is now a SEPARATE, still-scanned violation (`runtime-identity-branch`).
// Both halves matter: the two DATA forms below must stay silent, and the
// LOGIC forms must be caught.
describe("boundary-check: control-plane runtime-identity-BRANCH (P460 FIX 3)", () => {
  test("if (rt === \"claude\") inside a control-plane file is flagged as runtime-identity-branch", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460-control-plane-branch-if-"));
    try {
      mkdirSync(join(scratchSrc, "control-plane"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "control-plane", "route.ts"),
        'function pick(rt: string): string {\n  if (rt === "claude") return "claude-branch";\n  return "other";\n}\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.file).toBe("control-plane/route.ts");
      expect(violations[0]!.kind).toBe("runtime-identity-branch");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a switch/case on a runtime literal inside a control-plane file is flagged as runtime-identity-branch", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460-control-plane-branch-case-"));
    try {
      mkdirSync(join(scratchSrc, "control-plane"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "control-plane", "route2.ts"),
        'function pick(rt: string): string {\n  switch (rt) {\n    case "codex":\n      return "codex-branch";\n    default:\n      return "other";\n  }\n}\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.file).toBe("control-plane/route2.ts");
      expect(violations[0]!.kind).toBe("runtime-identity-branch");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("the two DATA forms (object-property assignment, array literal) inside a control-plane file are NOT flagged", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460-control-plane-branch-data-"));
    try {
      mkdirSync(join(scratchSrc, "control-plane"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "control-plane", "catalog.ts"),
        'const catalogEntry = { runtimeScope: "claude" as const };\n' +
          'const scopes: readonly string[] = ["claude", "codex", "gemini"];\n' +
          'export type RuntimeScope = "codex" | "claude" | "gemini" | "all";\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P460 FIX 2 (decisions/pm2-core-safety-correction.md): boundary:check
// gains a rule forbidding any non-test src/** file from importing
// src/governance/testing/** — the structural half of "a caller cannot
// install a permissive security oracle".
describe("boundary-check: governance testing module is off-limits to production src/** (P460 FIX 2)", () => {
  test("resolvesIntoGovernanceTesting: a relative import reaching src/governance/testing/trusted-oracle from OUTSIDE that directory is a violation", () => {
    expect(resolvesIntoGovernanceTesting("../governance/testing/trusted-oracle", "/pkg/src/altitude2", "/pkg/src")).toBe(true);
  });

  test("resolvesIntoGovernanceTesting: importing src/governance/index (the sanctioned entry point) is NOT a violation", () => {
    expect(resolvesIntoGovernanceTesting("../governance/index", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("a src/** file OUTSIDE src/governance/testing importing it is caught (live filesystem scan)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460-governance-testing-import-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "testing", "trusted-oracle.ts"), "export function installSecurityOracle() {}\n");
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'import { installSecurityOracle } from "../governance/testing/trusted-oracle";\ninstallSecurityOracle();\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toEqual([
        {
          file: "altitude2/bypass-attempt.ts",
          kind: "governance-testing-import",
          detail: 'imports "../governance/testing/trusted-oracle" — src/governance/testing/** is test-only (P460 FIX 2: no non-test src/** file may install a security oracle)',
        },
      ]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a file WITHIN src/governance/testing importing its own sibling is NOT flagged (self-reference allowed)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460-governance-testing-self-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "testing", "security-oracle-internals.ts"), "export function helper() {}\n");
      writeFileSync(
        join(scratchSrc, "governance", "testing", "trusted-oracle.ts"),
        'import { helper } from "./security-oracle-internals";\nhelper();\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P460 v2 (decisions/pm2-core-safety-correction.md "v2 Correction" item 2):
// the fresh P460 re-verifier's exploit 2b — banning
// `src/governance/testing/**` was not enough, because `security-oracle.ts`
// itself (the module `installSecurityOracle`/`resolveActiveOracle` actually
// live in) was never import-banned for production code. This rule mirrors
// `governance-writer-import`'s pattern exactly: no file outside
// `src/governance/**`, and no non-`*.test.ts` file, may import a specifier
// resolving to `src/governance/security-oracle.ts`.
describe("boundary-check: security-oracle module is off-limits to production src/** outside governance (P460 v2)", () => {
  test("resolvesIntoGovernanceSecurityOracle: a relative import reaching src/governance/security-oracle from OUTSIDE governance is a violation", () => {
    expect(resolvesIntoGovernanceSecurityOracle("../governance/security-oracle", "/pkg/src/altitude2", "/pkg/src")).toBe(true);
  });

  test("resolvesIntoGovernanceSecurityOracle: importing src/governance/index (the sanctioned entry point) is NOT a violation", () => {
    expect(resolvesIntoGovernanceSecurityOracle("../governance/index", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
    expect(resolvesIntoGovernanceSecurityOracle("../governance", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("resolvesIntoGovernanceSecurityOracle: importing src/governance/testing/trusted-oracle (a DIFFERENT module) is NOT flagged by this predicate", () => {
    expect(resolvesIntoGovernanceSecurityOracle("../governance/testing/trusted-oracle", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("a src/altitude2/** file deep-importing installSecurityOracle directly from security-oracle is caught (live filesystem scan — the exact exploit-2b shape)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v2-security-oracle-import-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "governance", "security-oracle.ts"),
        'export function installSecurityOracle() {}\nexport function resolveActiveOracle() { return {}; }\n',
      );
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'import { installSecurityOracle } from "../governance/security-oracle";\ninstallSecurityOracle();\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toEqual([
        {
          file: "altitude2/bypass-attempt.ts",
          kind: "governance-security-oracle-import",
          detail: 'imports "../governance/security-oracle" — src/governance/security-oracle.ts is governance-internal/test-only (P460 v2: no production src/** file outside src/governance/** may read or install the security oracle directly)',
        },
      ]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a file WITHIN src/governance importing security-oracle (e.g. commit-gate.ts's own real import) is NOT flagged (self-reference allowed)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v2-security-oracle-self-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "security-oracle.ts"), "export function resolveActiveOracle() { return {}; }\n");
      writeFileSync(
        join(scratchSrc, "governance", "commit-gate.ts"),
        'import { resolveActiveOracle } from "./security-oracle";\nresolveActiveOracle();\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("src/governance/testing/trusted-oracle.ts (a src/governance/** file) importing security-oracle is NOT flagged — matches the real, intended test-install path", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v2-security-oracle-testing-dir-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "security-oracle.ts"), "export function installSecurityOracle() {}\n");
      writeFileSync(
        join(scratchSrc, "governance", "testing", "trusted-oracle.ts"),
        'import { installSecurityOracle } from "../security-oracle";\ninstallSecurityOracle();\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a *.test.ts file OUTSIDE src/governance importing security-oracle directly is NOT flagged (the *.test.ts carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v2-security-oracle-test-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "security-oracle.ts"), "export function installSecurityOracle() {}\n");
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "some-check.test.ts"),
        'import { installSecurityOracle } from "../governance/security-oracle";\ninstallSecurityOracle();\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
// Lead Selection — Option 1+", item 2): `createCommitGate`
// (`src/governance/commit-gate.ts`'s gate FACTORY) is governance/test-only —
// mirrors `resolvesIntoGovernanceSecurityOracle`'s rule one file over.
describe("boundary-check: commit-gate factory is off-limits to production src/** outside governance (P460 v3)", () => {
  test("resolvesIntoGovernanceCommitGate: a relative import reaching src/governance/commit-gate from OUTSIDE governance is a violation", () => {
    expect(resolvesIntoGovernanceCommitGate("../governance/commit-gate", "/pkg/src/altitude2", "/pkg/src")).toBe(true);
  });

  test("resolvesIntoGovernanceCommitGate: importing src/governance/index (the sanctioned entry point) is NOT a violation", () => {
    expect(resolvesIntoGovernanceCommitGate("../governance/index", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
    expect(resolvesIntoGovernanceCommitGate("../governance", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("resolvesIntoGovernanceCommitGate: importing src/governance/security-oracle (a DIFFERENT module) is NOT flagged by this predicate", () => {
    expect(resolvesIntoGovernanceCommitGate("../governance/security-oracle", "/pkg/src/altitude2", "/pkg/src")).toBe(false);
  });

  test("a src/altitude2/** file deep-importing createCommitGate directly from commit-gate is caught (live filesystem scan — create then FAIL)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-commit-gate-import-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "governance", "commit-gate.ts"),
        "export function createCommitGate() { return {}; }\n",
      );
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'import { createCommitGate } from "../governance/commit-gate";\ncreateCommitGate();\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toEqual([
        {
          file: "altitude2/bypass-attempt.ts",
          kind: "governance-commit-gate-factory-import",
          detail:
            'imports "../governance/commit-gate" — src/governance/commit-gate.ts\'s createCommitGate is governance-internal/test-only (P460 v3: no production src/** file outside src/governance/** may build its own commit gate; use PRODUCTION_COMMIT_GATE from src/governance/index.ts)',
        },
      ]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("removing the deep import (using the sanctioned barrel instead) PASSES — same file, bite removed", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-commit-gate-import-fixed-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "commit-gate.ts"), "export function createCommitGate() { return {}; }\n");
      writeFileSync(join(scratchSrc, "governance", "index.ts"), "export const PRODUCTION_COMMIT_GATE = {};\n");
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'import { PRODUCTION_COMMIT_GATE } from "../governance";\nPRODUCTION_COMMIT_GATE;\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a file WITHIN src/governance importing commit-gate (e.g. index.ts's own real import) is NOT flagged (self-reference allowed)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-commit-gate-self-"));
    try {
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "commit-gate.ts"), "export function createCommitGate() { return {}; }\n");
      writeFileSync(
        join(scratchSrc, "governance", "index.ts"),
        'import { createCommitGate } from "./commit-gate";\nexport const PRODUCTION_COMMIT_GATE = createCommitGate();\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });
});

// P460 v3 (decisions/pm2-gate-threat-model-escalation.md "The surviving
// finding (irreducible in-language)" + "User Ruling and Lead Selection —
// Option 1+", item 5): a computed/non-literal dynamic import()/require()
// argument evades every LITERAL-specifier rule above. This rule flags the
// SHAPE itself, regardless of what it resolves to.
describe("boundary-check: computed dynamic import()/require() is banned in production src/** (P460 v3)", () => {
  test("isSingleStringLiteralArg: a single quoted string literal (single or double quotes) is fine", () => {
    expect(isSingleStringLiteralArg('"./foo"')).toBe(true);
    expect(isSingleStringLiteralArg("'../governance'")).toBe(true);
  });

  test("isSingleStringLiteralArg: a variable, concatenation, template interpolation, or array-join is not a literal", () => {
    expect(isSingleStringLiteralArg("spec")).toBe(false);
    expect(isSingleStringLiteralArg('"../governance/" + "security-oracle"')).toBe(false);
    expect(isSingleStringLiteralArg('`../governance/${name}`')).toBe(false);
    expect(isSingleStringLiteralArg('["..", "governance", "security-oracle"].join("/")')).toBe(false);
  });

  test("(i) a production src/altitude2 file with a computed dynamic import FAILS the new rule (live filesystem scan — create then FAIL)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-computed-import-fail-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "computed-bypass.ts"),
        'const spec = ["..", "governance", "security-oracle"].join("/");\nasync function load() {\n  const m = await import(spec);\n  return m;\n}\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.file).toBe("altitude2/computed-bypass.ts");
      expect(violations[0]!.kind).toBe("computed-dynamic-import");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("(ii) removing the computed import (a plain literal import() instead) PASSES — same file, bite removed", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-computed-import-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "computed-bypass.ts"),
        'async function load() {\n  const m = await import("./sibling");\n  return m;\n}\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a computed require() call is caught identically to a computed import()", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-computed-require-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "computed-require.ts"), 'const name = "sibling";\nconst m = require("./" + name);\n');

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.kind).toBe("computed-dynamic-import");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a *.test.ts file with a computed dynamic import is NOT flagged (test carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-computed-import-test-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "some-check.test.ts"),
        'const spec = "./sibling";\nconst m = await import(spec);\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a src/governance/testing/** file with a computed dynamic import is NOT flagged (the guarded test-install directory carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v3-computed-import-governance-testing-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "governance", "testing", "loader.ts"),
        'const spec = "./trusted-oracle";\nconst m = await import(spec);\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("the current scaffold's real src/ tree has zero computed-dynamic-import violations", () => {
    const srcDir = resolve(import.meta.dir, "..", "..", "src");
    const violations = scanBoundaries(srcDir).filter((v) => v.kind === "computed-dynamic-import");
    expect(violations).toEqual([]);
  });
});

// P460 v4 (decisions/pm2-gate-threat-model-escalation.md "Fifth Finding
// (aliased require)" / "v4 hygiene"): every LITERAL-specifier rule above
// (governance-writer-import, -security-oracle-import,
// -commit-gate-factory-import) and computed-dynamic-import all match the
// literal text `import(`/`require(` — invisible to an ALIASED reference
// (`const req = require; req("literal")`). This rule flags the bare
// identifier's SHAPE itself: allowed only as a static "import ... from"
// declaration or a direct, non-property-access call.
describe("boundary-check: stripLineAndBlockComments (P460 v4 — false-positive guard)", () => {
  test("blanks // line-comment content but preserves length and surrounding code", () => {
    const input = 'const x = 1; // these functions require session.state\nconst y = 2;\n';
    const stripped = stripLineAndBlockComments(input);
    expect(stripped.length).toBe(input.length);
    expect(stripped).not.toMatch(/require/);
    expect(stripped).toContain("const x = 1;");
    expect(stripped).toContain("const y = 2;");
  });

  test("blanks /* block-comment */ content but preserves length", () => {
    const input = "const x = 1; /* callers require nothing special */ const y = 2;";
    const stripped = stripLineAndBlockComments(input);
    expect(stripped.length).toBe(input.length);
    expect(stripped).not.toMatch(/require/);
  });

  test("blanks string/template-literal BODY content (keeping delimiters) but preserves length", () => {
    const input = 'const msg = `reads require state "READ_OR_QUERY"`;';
    const stripped = stripLineAndBlockComments(input);
    expect(stripped.length).toBe(input.length);
    expect(stripped).not.toMatch(/require/);
    expect(stripped).toContain("const msg = `");
  });

  test("does NOT blank a real import declaration (code, not inside a comment/string)", () => {
    const input = 'import { X } from "./y";\nrequire("./z");\n';
    const stripped = stripLineAndBlockComments(input);
    expect(stripped).toContain("import { X } from");
    expect(stripped).toMatch(/require\(/);
  });
});

describe("boundary-check: isAllowedModuleTokenOccurrence pure predicate (P460 v4)", () => {
  test("a static named import is allowed", () => {
    const text = 'import { X } from "./y";';
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("import"), "import")).toBe(true);
  });

  test("a static default-only import is allowed (no trailing comma required)", () => {
    const text = 'import schema from "./y.json";';
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("import"), "import")).toBe(true);
  });

  test("a direct import() call is allowed", () => {
    const text = 'const m = import("./y");';
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("import"), "import")).toBe(true);
  });

  test("a direct require() call is allowed", () => {
    const text = 'const m = require("./y");';
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("require"), "require")).toBe(true);
  });

  test("aliasing require to a variable is NOT allowed", () => {
    const text = "const req = require;";
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("require"), "require")).toBe(false);
  });

  test("a comma-operator indirect call is NOT allowed", () => {
    const text = '(0, require)("x");';
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("require"), "require")).toBe(false);
  });

  test("property access (globalThis.require) is NOT allowed", () => {
    const text = "globalThis.require;";
    expect(isAllowedModuleTokenOccurrence(text, text.indexOf("require"), "require")).toBe(false);
  });
});

describe("boundary-check: indirect-module-access live filesystem scan (P460 v4)", () => {
  test("const req = require; req(\"literal\") FAILS with indirect-module-access (live scan — create then FAIL)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-aliased-require-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "bypass-attempt.ts"),
        'const req = require;\nconst gate = req("../governance/commit-gate");\n',
      );

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.file).toBe("altitude2/bypass-attempt.ts");
      expect(violations[0]!.kind).toBe("indirect-module-access");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("(0, require)(\"x\") FAILS with indirect-module-access", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-comma-operator-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "bypass-attempt.ts"), '(0, require)("x");\n');

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.kind).toBe("indirect-module-access");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("globalThis.require FAILS with indirect-module-access", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-globalthis-require-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "bypass-attempt.ts"), "const r = globalThis.require;\n");

      const violations = scanBoundaries(scratchSrc);
      expect(violations).toHaveLength(1);
      expect(violations[0]!.kind).toBe("indirect-module-access");
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a normal static import { X } from \"./y\" PASSES", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-static-import-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      mkdirSync(join(scratchSrc, "governance"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "index.ts"), "export const PRODUCTION_COMMIT_GATE = {};\n");
      writeFileSync(
        join(scratchSrc, "altitude2", "ok.ts"),
        'import { PRODUCTION_COMMIT_GATE } from "../governance";\nPRODUCTION_COMMIT_GATE;\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a direct import(\"./literal\") PASSES", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-direct-import-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "sibling.ts"), "export const x = 1;\n");
      writeFileSync(
        join(scratchSrc, "altitude2", "ok.ts"),
        'async function load() {\n  const m = await import("./sibling");\n  return m;\n}\n',
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a direct require(\"./literal\") PASSES (the linter allows the direct-call form itself)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-direct-require-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "sibling.ts"), "export const x = 1;\n");
      writeFileSync(join(scratchSrc, "altitude2", "ok.ts"), 'const m = require("./sibling");\n');

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("ordinary English prose containing \"require\" in a comment or string is NOT flagged (false-positive guard: real shape from src/altitude2/reads.ts)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-prose-not-flagged-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(
        join(scratchSrc, "altitude2", "reads-like.ts"),
        '// These three functions require `session.state` to have already reached READ_OR_QUERY.\n' +
          'export function check(state: string): string {\n' +
          '  return `reads require state "READ_OR_QUERY", got "${state}"`;\n' +
          "}\n",
      );

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("removing the aliased require (using a direct call instead) PASSES — same file, bite removed", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-aliased-require-fixed-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "sibling.ts"), "export const x = 1;\n");
      writeFileSync(join(scratchSrc, "altitude2", "ok.ts"), 'const m = require("./sibling");\n');

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a *.test.ts file aliasing require is NOT flagged (test carve-out, matches every other v3/v4 rule's carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-test-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "some-check.test.ts"), "const req = require;\nreq(\"./x\");\n");

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("a src/governance/testing/** file aliasing require is NOT flagged (guarded test-install directory carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v4-governance-testing-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "testing", "loader.ts"), "const req = require;\nreq(\"./x\");\n");

      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("the current scaffold's real src/ tree has zero indirect-module-access violations", () => {
    const srcDir = resolve(import.meta.dir, "..", "..", "src");
    const violations = scanBoundaries(srcDir).filter((v) => v.kind === "indirect-module-access");
    expect(violations).toEqual([]);
  });
});

// P460 v5 (decisions/pm2-gate-threat-model-escalation.md "Sixth Finding
// (module[\"require\"]) — Lead Adjudication + v5"): `module["require"]` is
// a literal bracket property access on the CommonJS module object — the
// quoted "require" is blanked by stripLineAndBlockComments, so v4's
// bare-token scan (which only ever looks AT the require/import tokens
// themselves) never sees it; the token it needed to catch was `module`,
// not `require`. This closes the whole enumerable module-loader-handle
// family the Lead adjudicated it belongs to: module.X/module[...],
// createRequire, require.main/require.cache, process.mainModule, and a
// static/dynamic import of the `module`/`node:module` built-in.
describe("boundary-check: module-loader-handle family live filesystem scan (P460 v5)", () => {
  function scanOne(source: string): ReturnType<typeof scanBoundaries> {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-module-loader-handle-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "bypass-attempt.ts"), source);
      return scanBoundaries(scratchSrc);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  }

  test('module["require"] (the sixth finding, bracket property access) FAILS with module-loader-handle', () => {
    const violations = scanOne('const r = module["require"];\nr("../../governance/atomic-write");\n');
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("module.require (dot property access) FAILS with module-loader-handle", () => {
    const violations = scanOne("const r = module.require;\n");
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("module.createRequire FAILS with module-loader-handle", () => {
    const violations = scanOne("const cr = module.createRequire(import.meta.url);\n");
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test('import from "node:module" FAILS with module-loader-handle', () => {
    const violations = scanOne('import { createRequire } from "node:module";\n');
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("createRequire(x) (bare identifier, e.g. imported from a re-export) FAILS with module-loader-handle", () => {
    const violations = scanOne('import { createRequire } from "some-shim";\nconst req = createRequire(import.meta.url);\n');
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("require.main FAILS with module-loader-handle", () => {
    const violations = scanOne("if (require.main) {\n  doThing();\n}\n");
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("require.cache FAILS with module-loader-handle", () => {
    const violations = scanOne("const c = require.cache;\n");
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test("process.mainModule FAILS with module-loader-handle", () => {
    const violations = scanOne("const m = process.mainModule;\n");
    expect(violations.some((v) => v.kind === "module-loader-handle")).toBe(true);
  });

  test('Function("return require")() PASSES (documented eval-class residual, not caught)', () => {
    const violations = scanOne('const r = Function("return require")();\n');
    expect(violations).toEqual([]);
  });

  test('eval("require") PASSES (documented eval-class residual, not caught)', () => {
    const violations = scanOne('const r = eval("require");\n');
    expect(violations).toEqual([]);
  });

  test('globalThis["req"+"uire"] PASSES (documented eval-class residual, not caught)', () => {
    const violations = scanOne('const r = globalThis["req"+"uire"];\n');
    expect(violations).toEqual([]);
  });

  test('a normal static import ... from "./y" PASSES', () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-static-import-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "y.ts"), "export const x = 1;\n");
      writeFileSync(join(scratchSrc, "altitude2", "ok.ts"), 'import { x } from "./y";\nx;\n');
      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test('a direct import("./lit") PASSES', () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-direct-import-pass-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "lit.ts"), "export const x = 1;\n");
      writeFileSync(
        join(scratchSrc, "altitude2", "ok.ts"),
        'async function load() {\n  const m = await import("./lit");\n  return m;\n}\n',
      );
      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test('prose comments/strings containing the word "module" are NOT flagged (false-positive guard)', () => {
    const violations = scanOne(
      '// This module handles altitude-2 reads; the module boundary is enforced elsewhere.\n' +
        'export function check(state: string): string {\n' +
        '  return `this module reports state "${state}"`;\n' +
        "}\n",
    );
    expect(violations).toEqual([]);
  });

  test("a *.test.ts file using module[\"require\"] is NOT flagged (test carve-out, matches every other v3/v4/v5 rule's carve-out)", () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-test-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "some-check.test.ts"), 'const r = module["require"];\n');
      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test('a src/governance/testing/** file using module["require"] is NOT flagged (guarded test-install directory carve-out)', () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-governance-testing-carveout-"));
    try {
      mkdirSync(join(scratchSrc, "governance", "testing"), { recursive: true });
      writeFileSync(join(scratchSrc, "governance", "testing", "loader.ts"), 'const r = module["require"];\n');
      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test('removing module["require"] (using a direct import instead) PASSES — same file, bite removed', () => {
    const scratchSrc = mkdtempSync(join(tmpdir(), "p460v5-bite-fixed-"));
    try {
      mkdirSync(join(scratchSrc, "altitude2"), { recursive: true });
      writeFileSync(join(scratchSrc, "altitude2", "atomic-write.ts"), "export function atomicWriteFile() {}\n");
      writeFileSync(
        join(scratchSrc, "altitude2", "ok.ts"),
        'import { atomicWriteFile } from "./atomic-write";\natomicWriteFile();\n',
      );
      expect(scanBoundaries(scratchSrc)).toEqual([]);
    } finally {
      rmSync(scratchSrc, { recursive: true, force: true });
    }
  });

  test("the current scaffold's real src/ tree has zero module-loader-handle violations", () => {
    const srcDir = resolve(import.meta.dir, "..", "..", "src");
    const violations = scanBoundaries(srcDir).filter((v) => v.kind === "module-loader-handle");
    expect(violations).toEqual([]);
  });
});
