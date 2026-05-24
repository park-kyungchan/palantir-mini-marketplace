// palantir-mini v3.7.0 — hooks/subagent-stop/contract.ts
// Output Contract markdown parser + schema validator.
// Extracted from subagent-stop.ts during A.1 decomposition.

import type { OutputContract, ValidationResult } from "./types";

/**
 * Parses `## Output Contract` section from an agent `.md` body.
 * Expected shape (markdown):
 *
 *   ## Output Contract
 *   - statePath: .palantir-mini/session/blueprint.json
 *   - requiredFields: schema_version, primitives, edges
 *   - envelopeKind: blueprint
 *
 * Lines are tolerant of surrounding spaces and JSON-like comma lists.
 * Returns null if section absent.
 */
export function parseOutputContract(mdContent: string): OutputContract | null {
  const match = mdContent.match(/##\s+Output Contract\s*\n([\s\S]*?)(?=\n##\s|\n---|\z)/i);
  if (!match) return null;
  const body = match[1] ?? "";

  const pathMatch        = body.match(/-\s*statePath\s*:\s*(.+)$/im);
  const requiredMatch    = body.match(/-\s*requiredFields\s*:\s*(.+)$/im);
  const envelopeMatch    = body.match(/-\s*envelopeKind\s*:\s*(.+)$/im);

  if (!pathMatch || !requiredMatch) return null;

  const statePath = pathMatch[1]!.trim().replace(/^["']|["']$/g, "");
  const requiredRaw = requiredMatch[1]!.trim().replace(/^\[|\]$/g, "");
  const requiredFields = requiredRaw
    .split(/[,\s]+/)
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f.length > 0);

  const contract: OutputContract = { statePath, requiredFields };
  if (envelopeMatch) {
    contract.envelopeKind = envelopeMatch[1]!.trim().replace(/^["']|["']$/g, "");
  }
  return contract;
}

/**
 * Validates a read object against a contract. If envelopeKind is declared and
 * the object is flat (no envelopeKind key), wrap on read and revalidate.
 * Pure function — takes a parsed object, returns a verdict.
 */
export function validateAgainstContract(raw: unknown, contract: OutputContract): ValidationResult {
  if (raw === null || typeof raw !== "object") {
    return { passed: false, errorClass: "NotAnObject", message: "state file did not parse to an object" };
  }

  let target = raw as Record<string, unknown>;
  let wrapped = false;

  if (contract.envelopeKind) {
    const key = contract.envelopeKind;
    const hasEnvelopeKey = Object.prototype.hasOwnProperty.call(target, key);
    if (!hasEnvelopeKey) {
      // Wrap on read: flat payload → {envelopeKind: flatPayload}
      target = { [key]: raw } as Record<string, unknown>;
      wrapped = true;
    }
    const inner = target[key];
    if (inner === null || typeof inner !== "object") {
      return { passed: false, errorClass: "EnvelopeInnerNotObject", message: `envelope "${key}" inner payload is not an object`, wrapped };
    }
    // Required fields are on the INNER payload, not the envelope.
    const innerObj = inner as Record<string, unknown>;
    const missing = contract.requiredFields.filter((f) => !Object.prototype.hasOwnProperty.call(innerObj, f));
    if (missing.length > 0) {
      return { passed: false, errorClass: "MissingRequiredFields", message: `missing required fields under "${key}": ${missing.join(", ")}`, wrapped };
    }
    return { passed: true, wrapped };
  }

  // No envelope — validate flat object
  const missing = contract.requiredFields.filter((f) => !Object.prototype.hasOwnProperty.call(target, f));
  if (missing.length > 0) {
    return { passed: false, errorClass: "MissingRequiredFields", message: `missing required fields: ${missing.join(", ")}` };
  }
  return { passed: true, wrapped };
}
