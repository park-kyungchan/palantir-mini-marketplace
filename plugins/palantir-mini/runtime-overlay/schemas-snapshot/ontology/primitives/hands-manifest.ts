/**
 * @stable — HandsManifest primitive (prim-harness-11, v1.42.0)
 *
 * Workspace-materialization manifest mirroring the OpenAI Agents SDK
 * `Manifest` schema (April 2026 launch). Declares the starting contents
 * + layout for a fresh sandbox workspace before agent execution begins.
 * The "Hands" layer in Lance Martin's Brain/Hands/Session model — *cattle,
 * not pets* — is parameterized through this declaration so palantir-mini
 * can swap sandbox providers (Unix-local / Docker / Blaxel / Cloudflare /
 * Daytona / E2B / Modal / Runloop / Vercel) without changing agent code.
 *
 * Core invariants:
 *   - Every entry's `dst` field is workspace-relative (no absolute paths,
 *     no `..` traversal). Validation via `validateHandsManifest`.
 *   - `EnvVarEntry.value` may carry secrets — caller MUST treat the
 *     manifest as runtime configuration, not prompt content (per OpenAI
 *     "Treat sandbox credentials as runtime configuration, not prompt
 *     content"). Do NOT echo manifest values into events.jsonl.
 *   - `workspaceBase` is the conventional mount point inside the sandbox
 *     (e.g. `/workspace/`); entries' `dst` fields are joined onto it at
 *     materialization time.
 *
 * D/L/A domain: ACTION (the manifest declares state to be materialized at
 * sandbox-start time; consumed by the SandboxClient interface in W3.C).
 *
 * Authority chain:
 *   research/openai/sandbox-agents-developer-docs.md (Manifest schema +
 *     entry types verbatim; storage mounts + credential handling rules)
 *     + research/openai/agents-sdk-next-evolution-2026-04-15.md
 *     + research/anthropic/scaling-managed-agents-2026-04-08.md (Hands
 *       layer model — *cattle, not pets*)
 *     ↓
 *   plans/mellow-plotting-oasis.md §Wave 2 W2.A.2
 *     ↓
 *   schemas/ontology/primitives/hands-manifest.ts (this file)
 *     ↓
 *   palantir-mini/lib/sandbox/SandboxClient.ts (Wave 3 W3.C wiring)
 *     + bridge/handlers/pm-sandbox-* (provider-dispatch handlers)
 *
 * Rule cross-refs: rule 16 v4.1.0 §0 (5 harness species — Hands layer
 * portability across species); rule 26 v1.0.0 §Axis D1 (Shareable —
 * provider-neutral); rule 10 v3.0.0 §propagationDepth (manifest
 * materialization is the origin layer of a sandbox-bound execution chain).
 *
 * @owner palantirkc-ontology
 * @purpose Provider-neutral sandbox-workspace materialization manifest
 */

/**
 * Discriminator for manifest-entry kinds. Six initial variants covering the
 * common cases from the OpenAI Agents SDK April 2026 surface (LocalDir,
 * GitRepo, EnvVar, S3Mount, GCSMount, R2Mount). Future variants (AzureBlob,
 * Box) plug into the same union without breaking existing consumers.
 */
export type HandsManifestEntryKind =
  | "local-dir"
  | "git-repo"
  | "env-var"
  | "s3-mount"
  | "gcs-mount"
  | "r2-mount";

/**
 * Materialize a host directory into the sandbox workspace.
 *
 * - `src` MUST be an absolute host path. Relative paths are rejected by
 *   `validateHandsManifest` because the host CWD is provider-dependent
 *   (Docker bind-mounts vs Cloudflare R2 staging differ).
 * - `dst` MUST be workspace-relative; no leading `/`, no `..` segment.
 */
export interface LocalDirEntry {
  readonly kind: "local-dir";
  readonly src: string;
  readonly dst: string;
}

/**
 * Clone a Git repository into the sandbox workspace.
 *
 * - `url` accepts any provider Git supports (https / ssh / file).
 * - `ref` may be a branch, tag, or 40-char SHA. Omitting selects the
 *   default branch at materialization time (caveat: not deterministic
 *   across runs unless pinned; recommended to pin SHA for repeatability).
 * - `dst` MUST be workspace-relative.
 */
export interface GitRepoEntry {
  readonly kind: "git-repo";
  readonly url: string;
  readonly ref?: string;
  readonly dst: string;
}

/**
 * Set an environment variable inside the sandbox at startup.
 *
 * - `name` follows POSIX env var conventions (`[A-Z_][A-Z0-9_]*`).
 * - `value` may be a literal string. Treat as a secret — the manifest
 *   is runtime configuration, not prompt content.
 */
export interface EnvVarEntry {
  readonly kind: "env-var";
  readonly name: string;
  readonly value: string;
}

/**
 * Mount an S3 bucket prefix at a workspace path.
 *
 * - `bucket` is the S3 bucket name.
 * - `prefix` (optional) scopes the mount to a sub-prefix; omit to mount
 *   the bucket root.
 * - `dst` MUST be workspace-relative.
 */
export interface S3MountEntry {
  readonly kind: "s3-mount";
  readonly bucket: string;
  readonly prefix?: string;
  readonly dst: string;
}

/**
 * Mount a GCS bucket prefix at a workspace path. Mirrors S3MountEntry.
 */
export interface GCSMountEntry {
  readonly kind: "gcs-mount";
  readonly bucket: string;
  readonly prefix?: string;
  readonly dst: string;
}

/**
 * Mount a Cloudflare R2 bucket prefix at a workspace path. Mirrors
 * S3MountEntry. Provider notes: R2 supports the S3 API surface, so
 * sandbox clients may treat R2MountEntry as an S3MountEntry alias when
 * materializing on R2-compatible providers (e.g. Vercel, Cloudflare).
 */
export interface R2MountEntry {
  readonly kind: "r2-mount";
  readonly bucket: string;
  readonly prefix?: string;
  readonly dst: string;
}

/**
 * Discriminated union of all manifest entry types. Add new variants by
 * extending `HandsManifestEntryKind` + this union together.
 */
export type HandsManifestEntry =
  | LocalDirEntry
  | GitRepoEntry
  | EnvVarEntry
  | S3MountEntry
  | GCSMountEntry
  | R2MountEntry;

/**
 * Branded RID type for manifest references — surfaces in lineage events
 * (W3 wiring) without leaking manifest contents into events.jsonl rows.
 */
export type HandsManifestRid = string & {
  readonly __brand: "HandsManifestRid";
};

export const handsManifestRid = (s: string): HandsManifestRid =>
  s as HandsManifestRid;

/**
 * Top-level manifest declaration. One per sandbox session; consumed by
 * the SandboxClient interface (W3.C) at session-start.
 *
 * - `manifestId` — stable RID for the manifest declaration; surfaces in
 *   `byWhom.runtime` field of subsequent events (rule 26 §A1).
 * - `entries` — ordered list of materialization entries; order is
 *   load-bearing (later entries may overwrite earlier ones at the same
 *   `dst`).
 * - `workspaceBase` — conventional mount root inside the sandbox; e.g.
 *   `/workspace/` (OpenAI default), `/sandbox/`, etc.
 */
export interface HandsManifestDeclaration {
  readonly manifestId: HandsManifestRid;
  readonly entries: readonly HandsManifestEntry[];
  readonly workspaceBase: string;
}

export const HANDS_MANIFEST_ENTRY_KINDS: readonly HandsManifestEntryKind[] = [
  "local-dir",
  "git-repo",
  "env-var",
  "s3-mount",
  "gcs-mount",
  "r2-mount",
] as const;

export function isHandsManifestEntryKind(
  s: string,
): s is HandsManifestEntryKind {
  return (HANDS_MANIFEST_ENTRY_KINDS as readonly string[]).includes(s);
}

/**
 * Validate a workspace-relative `dst` path.
 *
 * Rejects:
 *   - leading `/` (absolute path)
 *   - any segment equal to `..` (parent traversal)
 *   - any segment starting with `..` (e.g. `..foo` is allowed; `..` is
 *     not)
 *   - empty string
 *
 * Returns true on valid; false on reject. Use to bound manifest entries
 * to within the workspace root.
 */
function isWorkspaceRelativeDst(dst: string): boolean {
  if (typeof dst !== "string" || dst.length === 0) return false;
  if (dst.startsWith("/")) return false;
  const segments = dst.split("/");
  for (const seg of segments) {
    if (seg === "..") return false;
  }
  return true;
}

/**
 * Validate an absolute host path used in `LocalDirEntry.src`.
 *
 * Rejects:
 *   - empty string
 *   - non-absolute path (must start with `/`)
 *
 * Note: this does NOT verify the path exists on disk; existence checking
 * is the SandboxClient's job at materialization time.
 */
function isAbsoluteHostSrc(src: string): boolean {
  return typeof src === "string" && src.length > 0 && src.startsWith("/");
}

/**
 * Validate a manifest declaration. Returns `{ valid, errors }`. Errors are
 * accumulated (validate-all-then-report) to surface every problem in one
 * pass — the SandboxClient surfaces all errors before refusing to start.
 *
 * Validation rules:
 *   - `manifestId` non-empty.
 *   - `workspaceBase` non-empty + starts with `/`.
 *   - `entries` is an array (may be empty).
 *   - For each entry:
 *     - `kind` is a valid `HandsManifestEntryKind`.
 *     - `dst` (when present) is workspace-relative.
 *     - `LocalDirEntry.src` is an absolute host path.
 *     - `GitRepoEntry.url` is non-empty.
 *     - `EnvVarEntry.name` matches POSIX env var pattern.
 *     - `*MountEntry.bucket` is non-empty.
 */
export function validateHandsManifest(
  m: HandsManifestDeclaration,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof m.manifestId !== "string" || m.manifestId.length === 0) {
    errors.push("manifestId must be a non-empty string");
  }
  if (typeof m.workspaceBase !== "string" || m.workspaceBase.length === 0) {
    errors.push("workspaceBase must be a non-empty string");
  } else if (!m.workspaceBase.startsWith("/")) {
    errors.push("workspaceBase must start with '/' (absolute sandbox path)");
  }
  if (!Array.isArray(m.entries)) {
    errors.push("entries must be an array");
    return { valid: false, errors };
  }

  const envVarPattern = /^[A-Z_][A-Z0-9_]*$/;

  m.entries.forEach((entry, idx) => {
    if (!isHandsManifestEntryKind(entry.kind)) {
      errors.push(`entries[${idx}].kind invalid: ${String(entry.kind)}`);
      return;
    }

    switch (entry.kind) {
      case "local-dir": {
        const e = entry as LocalDirEntry;
        if (!isAbsoluteHostSrc(e.src)) {
          errors.push(`entries[${idx}].src must be an absolute host path`);
        }
        if (!isWorkspaceRelativeDst(e.dst)) {
          errors.push(
            `entries[${idx}].dst must be workspace-relative (no leading '/', no '..')`,
          );
        }
        break;
      }
      case "git-repo": {
        const e = entry as GitRepoEntry;
        if (typeof e.url !== "string" || e.url.length === 0) {
          errors.push(`entries[${idx}].url must be a non-empty string`);
        }
        if (!isWorkspaceRelativeDst(e.dst)) {
          errors.push(
            `entries[${idx}].dst must be workspace-relative (no leading '/', no '..')`,
          );
        }
        if (
          e.ref !== undefined &&
          (typeof e.ref !== "string" || e.ref.length === 0)
        ) {
          errors.push(`entries[${idx}].ref must be a non-empty string when set`);
        }
        break;
      }
      case "env-var": {
        const e = entry as EnvVarEntry;
        if (typeof e.name !== "string" || !envVarPattern.test(e.name)) {
          errors.push(
            `entries[${idx}].name must match POSIX env var pattern [A-Z_][A-Z0-9_]*`,
          );
        }
        if (typeof e.value !== "string") {
          errors.push(`entries[${idx}].value must be a string`);
        }
        break;
      }
      case "s3-mount":
      case "gcs-mount":
      case "r2-mount": {
        const e = entry as S3MountEntry | GCSMountEntry | R2MountEntry;
        if (typeof e.bucket !== "string" || e.bucket.length === 0) {
          errors.push(`entries[${idx}].bucket must be a non-empty string`);
        }
        if (!isWorkspaceRelativeDst(e.dst)) {
          errors.push(
            `entries[${idx}].dst must be workspace-relative (no leading '/', no '..')`,
          );
        }
        if (
          e.prefix !== undefined &&
          (typeof e.prefix !== "string" || e.prefix.length === 0)
        ) {
          errors.push(
            `entries[${idx}].prefix must be a non-empty string when set`,
          );
        }
        break;
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard — narrows `unknown` to a `HandsManifestDeclaration`. Use at
 * runtime when accepting manifest payloads from MCP / file IO.
 *
 * Validates structure only (presence + types of required fields). For
 * full validation including dst path discipline, call
 * `validateHandsManifest`.
 */
export function isHandsManifestDeclaration(
  x: unknown,
): x is HandsManifestDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const m = x as HandsManifestDeclaration;
  return (
    typeof m.manifestId === "string" &&
    typeof m.workspaceBase === "string" &&
    Array.isArray(m.entries)
  );
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Hands-layer sandbox manifest mirroring OpenAI Agents SDK schema; harness-portability primitive, not Foundry surface",
};
export { categoryFoundryEquivalent as handsManifestFoundryEquivalent };
