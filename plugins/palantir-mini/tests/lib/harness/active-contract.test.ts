import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  findActiveBoundContract,
  findActiveBoundContractPath,
} from "../../../lib/harness/active-contract";

function makeProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-active-contract-"));
}

function writeContract(
  project: string,
  sprintDir: string,
  contract: Record<string, unknown>,
): string {
  const dir = path.join(project, ".palantir-mini", "harness", "sprints", sprintDir);
  fs.mkdirSync(dir, { recursive: true });
  const contractPath = path.join(dir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  return path.relative(project, contractPath);
}

describe("active SprintContract selector", () => {
  test("returns null when no harness sprint contracts exist", () => {
    const project = makeProject();
    try {
      fs.mkdirSync(path.join(project, ".palantir-mini", "harness"), { recursive: true });
      expect(findActiveBoundContract(project)).toBe(null);
      expect(findActiveBoundContractPath(project)).toBe(null);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("current.json wins over inventory when it points to a bound contract", () => {
    const project = makeProject();
    try {
      const quick = writeContract(project, "sprint-001-quick", {
        status: "bound",
        mode: "quick",
        sprintNumber: 1,
        boundAt: "2026-05-10T00:00:00.000Z",
      });
      writeContract(project, "sprint-002-full", {
        status: "bound",
        mode: "full",
        sprintNumber: 2,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      fs.writeFileSync(
        path.join(project, ".palantir-mini", "harness", "current.json"),
        JSON.stringify({ contractPath: quick }, null, 2),
      );

      const selected = findActiveBoundContract(project);
      expect(selected?.relativePath).toBe(quick);
      expect(selected?.selectedBy).toBe("current-json");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("older quick sprint plus newer full sprint selects newer full contract", () => {
    const project = makeProject();
    try {
      writeContract(project, "sprint-001-quick", {
        status: "bound",
        mode: "quick",
        sprintNumber: 1,
        boundAt: "2026-05-10T00:00:00.000Z",
      });
      const full = writeContract(project, "sprint-002-full", {
        status: "bound",
        mode: "full",
        sprintNumber: 2,
        boundAt: "2026-05-11T00:00:00.000Z",
      });

      expect(findActiveBoundContractPath(project)).toBe(full);
      expect(findActiveBoundContract(project)?.contract.mode).toBe("full");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("uses mode priority and manual contract priority after boundAt and sprintNumber tie", () => {
    const project = makeProject();
    try {
      writeContract(project, "sprint-003-quick-auto", {
        status: "bound",
        mode: "quick",
        sprintNumber: 3,
        boundAt: "2026-05-11T00:00:00.000Z",
        autoBootstrapped: true,
      });
      const full = writeContract(project, "sprint-003-full-manual", {
        status: "bound",
        mode: "full",
        sprintNumber: 3,
        boundAt: "2026-05-11T00:00:00.000Z",
        autoBootstrapped: false,
      });

      expect(findActiveBoundContractPath(project)).toBe(full);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("orders mode priority as strict, full, lite, quick, other, then none", () => {
    const project = makeProject();
    try {
      writeContract(project, "sprint-005-none", {
        status: "bound",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      writeContract(project, "sprint-005-other", {
        status: "bound",
        mode: "custom",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      writeContract(project, "sprint-005-quick", {
        status: "bound",
        mode: "quick",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      writeContract(project, "sprint-005-lite", {
        status: "bound",
        mode: "lite",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      writeContract(project, "sprint-005-full", {
        status: "bound",
        mode: "full",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      const strict = writeContract(project, "sprint-005-strict", {
        status: "bound",
        mode: "strict",
        sprintNumber: 5,
        boundAt: "2026-05-11T00:00:00.000Z",
      });

      expect(findActiveBoundContractPath(project)).toBe(strict);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("lite outranks quick when timestamp and sprint tie", () => {
    const project = makeProject();
    try {
      writeContract(project, "sprint-006-quick", {
        status: "bound",
        mode: "quick",
        sprintNumber: 6,
        boundAt: "2026-05-11T00:00:00.000Z",
      });
      const lite = writeContract(project, "sprint-006-lite", {
        status: "bound",
        mode: "lite",
        sprintNumber: 6,
        boundAt: "2026-05-11T00:00:00.000Z",
      });

      expect(findActiveBoundContractPath(project)).toBe(lite);
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  test("falls back to inventory when current.json is stale", () => {
    const project = makeProject();
    try {
      const full = writeContract(project, "sprint-004-full", {
        status: "bound",
        mode: "full",
        sprintNumber: 4,
      });
      fs.writeFileSync(
        path.join(project, ".palantir-mini", "harness", "current.json"),
        JSON.stringify({ contractPath: ".palantir-mini/harness/sprints/missing/contract.json" }),
      );

      const selected = findActiveBoundContract(project);
      expect(selected?.relativePath).toBe(full);
      expect(selected?.selectedBy).toBe("inventory");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
