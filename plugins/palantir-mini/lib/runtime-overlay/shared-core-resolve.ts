// palantir-mini — lib/runtime-overlay/shared-core-resolve.ts
// Plugin-first ontology shared-core resolver.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolvePalantirMiniRoot } from "../config/root";

export type SharedCoreSource = "plugin-snapshot" | "external-dev-override";
export type SharedCoreProvenance =
  | "plugin-default"
  | "external-dev-override"
  | "missing";

export interface SharedCoreResolveResult {
  source: SharedCoreSource;
  provenance: SharedCoreProvenance;
  resolvedPath: string;
  externalVersion: string | null;
}

function readPackageVersion(dir: string): string | null {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

const HOME = process.env.HOME ?? os.homedir();
const PLUGIN_ROOT = resolvePalantirMiniRoot();

/**
 * Resolve the ontology shared-core root.
 *
 * The plugin-owned snapshot is the runtime default. External ~/ontology/shared-core
 * is only selected when PALANTIR_MINI_DEV_PREFER_EXTERNAL_ONTOLOGY=1 and the
 * external surface exists.
 */
export function resolveSharedCorePath(): SharedCoreResolveResult {
  const snapshotDir = path.join(PLUGIN_ROOT, "runtime-overlay", "ontology-shared-core");
  const externalDir = path.join(HOME, "ontology", "shared-core");
  const preferExternal = process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_ONTOLOGY === "1";

  if (preferExternal && fs.existsSync(path.join(externalDir, "index.ts"))) {
    return {
      source: "external-dev-override",
      provenance: "external-dev-override",
      resolvedPath: externalDir,
      externalVersion: readPackageVersion(externalDir),
    };
  }

  return {
    source: "plugin-snapshot",
    provenance: preferExternal ? "missing" : "plugin-default",
    resolvedPath: snapshotDir,
    externalVersion: readPackageVersion(externalDir),
  };
}
