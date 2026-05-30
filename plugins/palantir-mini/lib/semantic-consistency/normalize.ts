import { createHash } from "node:crypto";
import {
  SEMANTIC_NORMALIZATION_VERSION,
  type NormalizedTermValue,
} from "./types";

export interface NormalizeTermOptions {
  readonly sourceSystemId?: string;
  readonly fieldPath?: string;
  readonly objectPath?: string;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

export function stableHash(value: unknown, prefix = "sha256"): string {
  const digest = createHash("sha256").update(stableJson(value)).digest("hex");
  return `${prefix}:${digest}`;
}

export function shortStableHash(value: unknown, length = 24): string {
  return createHash("sha256").update(stableJson(value)).digest("hex").slice(0, length);
}

export function normalizeTermValue(
  original: string,
  options: NormalizeTermOptions = {},
): NormalizedTermValue {
  const normalized = original
    .normalize("NFKC")
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
  const slug = normalized
    .replace(/[^\p{L}\p{N}._:/-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "term";
  return {
    original,
    normalized,
    slug,
    locale: detectLocale(normalized),
    normalizationVersion: SEMANTIC_NORMALIZATION_VERSION,
    hash: stableHash({
      version: SEMANTIC_NORMALIZATION_VERSION,
      sourceSystemId: options.sourceSystemId ?? "",
      fieldPath: options.fieldPath ?? "",
      objectPath: options.objectPath ?? "",
      normalized,
    }, "term-hash"),
  };
}

function detectLocale(value: string): NormalizedTermValue["locale"] {
  const hasHangul = /[\u3131-\u318E\uAC00-\uD7A3]/u.test(value);
  const hasLatin = /[a-z]/u.test(value);
  if (hasHangul && hasLatin) return "mixed";
  if (hasHangul) return "ko";
  if (hasLatin) return "en";
  return "unknown";
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    if (input[key] === undefined) continue;
    out[key] = sortJsonValue(input[key]);
  }
  return out;
}
