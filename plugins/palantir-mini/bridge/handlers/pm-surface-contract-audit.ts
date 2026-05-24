import * as path from "path";
import {
  SURFACE_AUDIT_MODES,
  auditSurfaceContracts,
  type SurfaceAuditMode,
  type SurfaceContractAuditResult,
} from "../../lib/surface/audit";

export interface PmSurfaceContractAuditArgs {
  readonly projectRoot?: string;
  readonly mode?: SurfaceAuditMode;
  readonly failClosed?: boolean;
}

function modeFromInput(value: unknown): SurfaceAuditMode {
  return typeof value === "string" && SURFACE_AUDIT_MODES.includes(value as SurfaceAuditMode)
    ? value as SurfaceAuditMode
    : "all";
}

export async function pmSurfaceContractAudit(
  rawArgs: PmSurfaceContractAuditArgs = {},
): Promise<SurfaceContractAuditResult> {
  const pluginRoot = path.resolve(rawArgs.projectRoot ?? path.resolve(__dirname, "../.."));
  return auditSurfaceContracts({
    pluginRoot,
    mode: modeFromInput(rawArgs.mode),
    failClosed: rawArgs.failClosed === true,
  });
}

export default async function pmSurfaceContractAuditHandler(
  rawArgs: unknown,
): Promise<SurfaceContractAuditResult> {
  return pmSurfaceContractAudit((rawArgs ?? {}) as PmSurfaceContractAuditArgs);
}
