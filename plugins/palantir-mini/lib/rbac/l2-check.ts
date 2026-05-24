/**
 * palantir-mini v1 — L2 RBAC: CapabilityToken pre-flight check
 * @owner palantirkc-plugin-rbac
 * @purpose palantir-mini v1 — L2 RBAC: CapabilityToken pre-flight check
 */
// palantir-mini v1 — L2 RBAC: CapabilityToken pre-flight check
// Domain: SECURITY (prim-security-02 CapabilityToken)
//
// Validates a CapabilityToken for a given action before allowing L2-gated operations:
//   ship-merge, schema-write, ontology-register
//
// Called by managed-settings.d/50-palantir-mini.json L2 rules.
// Delegates to bridge/handlers/capability-token-check.ts logic.
//
// Authority: research/palantir/security/ → schemas/ontology/primitives/capability-token.ts
//   → lib/rbac/l2-check.ts → managed-settings.d/50-palantir-mini.json

export interface L2CheckInput {
  token:  string;
  action: string;
}

export interface L2CheckResult {
  allow:   boolean;
  reason?: string;
}

export const L2_GATED_ACTIONS = ["ship-merge", "schema-write", "ontology-register"] as const;
export type L2GatedAction = typeof L2_GATED_ACTIONS[number];

function decodeToken(token: string): Record<string, unknown> | null {
  try { return JSON.parse(token) as Record<string, unknown>; } catch { /* fall through */ }
  try { return JSON.parse(Buffer.from(token, "base64").toString("utf8")) as Record<string, unknown>; } catch { return null; }
}

function scopeCovers(scope: unknown, action: string): boolean {
  if (!Array.isArray(scope)) return false;
  return scope.some((s) =>
    s === "*" || s === action || (typeof s === "string" && s.endsWith("*") && action.startsWith(s.slice(0, -1)))
  );
}

export function l2Check(input: L2CheckInput): L2CheckResult {
  if (!input.token) return { allow: false, reason: "L2: no capability token provided" };
  if (!L2_GATED_ACTIONS.includes(input.action as L2GatedAction)) {
    // Not an L2-gated action — allow through
    return { allow: true };
  }

  const payload = decodeToken(input.token);
  if (!payload) return { allow: false, reason: "L2: token is not valid JSON" };

  const expiresAt = Date.parse(payload.expiresAt as string);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { allow: false, reason: `L2: token expired at ${payload.expiresAt as string}` };
  }

  if (!scopeCovers(payload.scope, input.action)) {
    return { allow: false, reason: `L2: token scope does not cover action "${input.action}"` };
  }

  if (!payload.signature) {
    return { allow: false, reason: "L2: token missing signature" };
  }

  return { allow: true };
}

// CLI entry point for use by managed-settings rules
// Usage: bun run lib/rbac/l2-check.ts <token> <action>
if (import.meta.main) {
  const [, , token, action] = process.argv;
  if (!token || !action) {
    console.error("usage: bun run lib/rbac/l2-check.ts <token> <action>");
    process.exit(1);
  }
  const result = l2Check({ token, action });
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result.allow ? 0 : 1);
}
