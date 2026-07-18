// Shared SHA-256 helper (node:crypto — no new dependency).

import { createHash } from "node:crypto";

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
