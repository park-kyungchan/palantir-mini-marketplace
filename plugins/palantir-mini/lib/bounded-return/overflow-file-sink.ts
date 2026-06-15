/**
 * Concrete fs sink for bounded-return overflow — the injected wiring boundary.
 *
 * Lifted VERBATIM out of `bridge/mcp-server.ts` (signatures unchanged) so the MCP
 * seam AND the pm_semantic_intent_gate handler import ONE implementation instead of
 * two divergent copies. The pure compute lib (`lib/bounded-return`) never touches fs;
 * these two functions are the only fs-touching part of the overflow machinery.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type { BoundedReturnSink, BoundedReturnSinkPort } from "./index";

/** Resolve the directory tree to write an overflow file under. */
export function resolveOverflowRoot(args: Record<string, unknown>): string {
  const candidate = args.projectRoot ?? args.project;
  if (typeof candidate === "string" && candidate.length > 0) {
    return path.join(candidate, ".palantir-mini", "mcp-response-overflow");
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-mcp-overflow-"));
}

/** Concrete fs sink — writes the serialized oversized full result to a unique file. */
export function makeOverflowFileSink(toolName: string, root: string): BoundedReturnSinkPort {
  return {
    write(serialized: string): BoundedReturnSink {
      fs.mkdirSync(root, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const shortHash = createHash("sha256").update(serialized).digest("hex").slice(0, 8);
      const file = path.join(root, `${toolName}-${stamp}-${shortHash}.json`);
      fs.writeFileSync(file, serialized);
      return { path: file, bytes: Buffer.byteLength(serialized, "utf8") };
    },
  };
}
