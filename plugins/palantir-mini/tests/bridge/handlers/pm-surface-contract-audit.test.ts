import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pmSurfaceContractAudit } from "../../../bridge/handlers/pm-surface-contract-audit";

describe("pm_surface_contract_audit", () => {
  test("returns advisory instead of fail for missing contracts unless failClosed is set", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-surface-handler-"));
    fs.mkdirSync(path.join(root, "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, "agents", "lead-orchestrator.md"), "# Lead\n");

    const advisory = await pmSurfaceContractAudit({ projectRoot: root, mode: "agents" });
    const failClosed = await pmSurfaceContractAudit({ projectRoot: root, mode: "agents", failClosed: true });

    expect(advisory.status).toBe("advisory");
    expect(failClosed.status).toBe("fail");
    expect(advisory.missingContractCount).toBe(1);
    expect(advisory.missingRequiredContractCount).toBe(1);
  });
});
