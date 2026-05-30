import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { eventsPathFor } from "../../scripts/log";
import { readEvents } from "../event-log/read";
import type { EventEnvelope } from "../event-log/types";

export type ReleaseChangedSurface =
  | "router"
  | "contract"
  | "prompt"
  | "dtc"
  | "agent"
  | "harness"
  | "governance"
  | "security"
  | "runtime"
  | "semantic-consistency";

export interface ReleaseChangedSurfaceEvidence {
  readonly surface: ReleaseChangedSurface;
  readonly path: string;
  readonly reason: string;
}

export interface JsonArtifact {
  readonly sourcePath: string;
  readonly data: Record<string, unknown>;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function runGit(projectRoot: string, args: string[]): string[] {
  try {
    return execFileSync("git", ["-C", projectRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function gitRootFor(projectRoot: string): string | null {
  const [root] = runGit(projectRoot, ["rev-parse", "--show-toplevel"]);
  return root ? path.resolve(root) : null;
}

function toProjectRelative(projectRoot: string, gitRoot: string, filePath: string): string | null {
  const absolute = path.resolve(gitRoot, filePath);
  const relative = path.relative(projectRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return normalizePath(relative);
}

export function collectChangedFiles(projectRoot: string): string[] {
  const gitRoot = gitRootFor(projectRoot);
  if (!gitRoot) return [];
  const tracked = runGit(projectRoot, ["diff", "--name-status", "--find-renames", "--diff-filter=ACMRT", "HEAD", "--"])
    .flatMap((line) => {
      const fields = line.split("\t");
      return fields.length >= 3 ? [fields[2]!] : fields.length >= 2 ? [fields[1]!] : [];
    });
  const changed = [
    ...tracked,
    ...runGit(projectRoot, ["ls-files", "--others", "--exclude-standard"]),
  ];
  return Array.from(new Set(
    changed
      .flatMap((filePath) => {
        const relative = toProjectRelative(projectRoot, gitRoot, filePath);
        return relative ? [relative] : [];
      })
      .sort((left, right) => left.localeCompare(right)),
  ));
}

function addSurface(
  output: ReleaseChangedSurfaceEvidence[],
  seen: Set<string>,
  pathName: string,
  surface: ReleaseChangedSurface,
  reason: string,
): void {
  const key = `${surface}:${pathName}`;
  if (seen.has(key)) return;
  seen.add(key);
  output.push({ surface, path: pathName, reason });
}

export function classifyReleaseChangedSurfaces(
  changedFiles: readonly string[],
): ReleaseChangedSurfaceEvidence[] {
  const output: ReleaseChangedSurfaceEvidence[] = [];
  const seen = new Set<string>();

  for (const rawPath of changedFiles) {
    const pathName = normalizePath(rawPath);
    const lower = pathName.toLowerCase();

    if (lower.includes("pm-intent-router")) {
      addSurface(output, seen, pathName, "router", "intent-router behavior changed");
      addSurface(output, seen, pathName, "governance", "routing governance behavior changed");
      addSurface(output, seen, pathName, "runtime", "runtime handler behavior changed");
    }
    if (lower.includes("pm-semantic-intent-gate") || lower.includes("prompt-dtc")) {
      addSurface(output, seen, pathName, "prompt", "prompt-front-door/DTC gate behavior changed");
      addSurface(output, seen, pathName, "dtc", "Digital Twin contract gate behavior changed");
      addSurface(output, seen, pathName, "contract", "contract validation behavior changed");
      addSurface(output, seen, pathName, "governance", "governance gate behavior changed");
    }
    if (
      lower.includes("/lib/lead-intent/") ||
      lower.includes("/lib/semantic-intent/") ||
      lower.includes("/lib/prompt-front-door/")
    ) {
      addSurface(output, seen, pathName, "contract", "contract or prompt persistence behavior changed");
      addSurface(output, seen, pathName, "prompt", "prompt contract behavior changed");
      addSurface(output, seen, pathName, "dtc", "Digital Twin contract behavior changed");
      addSurface(output, seen, pathName, "governance", "governance contract behavior changed");
    }
    if (
      lower.includes("/lib/semantic-consistency/") ||
      lower.includes("/tests/lib/semantic-consistency/") ||
      lower.includes("/eval-suites/semantic-consistency-regression") ||
      lower.includes("/tests/evals/semantic-consistency-regression.test.ts")
    ) {
      addSurface(output, seen, pathName, "semantic-consistency", "semantic consistency resolver/gate behavior changed");
      addSurface(output, seen, pathName, "contract", "semantic consistency contract boundary changed");
      addSurface(output, seen, pathName, "governance", "semantic consistency governance behavior changed");
    }
    if (
      lower.includes("/agents/") ||
      lower.includes("/agent/") ||
      lower.includes("agent-definition") ||
      lower.includes("check-declarations")
    ) {
      addSurface(output, seen, pathName, "agent", "agent declaration or agent routing behavior changed");
    }
    if (
      lower.includes("/lib/harness/") ||
      lower.includes("pm-harness") ||
      lower.includes("pm_plugin_self_check") ||
      lower.includes("pm-plugin-self-check") ||
      lower.includes("/tests/lib/harness/") ||
      lower.includes("release-gate-harness-evidence")
    ) {
      addSurface(output, seen, pathName, "harness", "harness/release-gate behavior changed");
      addSurface(output, seen, pathName, "runtime", "release runtime behavior changed");
      addSurface(output, seen, pathName, "governance", "release governance behavior changed");
    }
    if (
      lower.includes("managed-settings") ||
      lower.includes("permission") ||
      lower.includes("capability-token") ||
      lower.includes("security") ||
      lower.includes("/hooks/")
    ) {
      addSurface(output, seen, pathName, "security", "security or permission boundary changed");
    }
    if (lower.includes("/bridge/handlers/") || lower.includes("/hooks/")) {
      addSurface(output, seen, pathName, "runtime", "runtime handler or hook behavior changed");
    }
    if (lower.includes("/eval-suites/prompt-to-dtc-regression")) {
      addSurface(output, seen, pathName, "prompt", "prompt-to-DTC eval suite changed");
      addSurface(output, seen, pathName, "dtc", "prompt-to-DTC eval suite changed");
      addSurface(output, seen, pathName, "contract", "prompt-to-DTC eval suite changed");
    }
    if (lower.includes("/eval-suites/fde-turn-quality")) {
      addSurface(output, seen, pathName, "agent", "FDE/agent eval suite changed");
    }
    if (lower.includes("/eval-suites/ontology-engineering-cross-runtime-enforcement")) {
      addSurface(output, seen, pathName, "router", "ontology engineering cross-runtime eval suite changed");
      addSurface(output, seen, pathName, "contract", "ontology engineering cross-runtime eval suite changed");
      addSurface(output, seen, pathName, "prompt", "ontology engineering cross-runtime eval suite changed");
      addSurface(output, seen, pathName, "dtc", "ontology engineering cross-runtime eval suite changed");
      addSurface(output, seen, pathName, "runtime", "ontology engineering cross-runtime eval suite changed");
      addSurface(output, seen, pathName, "governance", "ontology engineering cross-runtime eval suite changed");
    }
  }

  return output.sort((left, right) =>
    `${left.surface}:${left.path}`.localeCompare(`${right.surface}:${right.path}`)
  );
}

function walkJsonFiles(dir: string, depth = 0, output: string[] = []): string[] {
  if (depth > 2 || output.length >= 200 || !fs.existsSync(dir)) return output;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkJsonFiles(entryPath, depth + 1, output);
      continue;
    }
    if (ent.isFile() && ent.name.endsWith(".json")) output.push(entryPath);
    if (output.length >= 200) break;
  }
  return output;
}

export function readJsonArtifacts(
  projectRoot: string,
  relativeDirs: readonly string[],
): JsonArtifact[] {
  return relativeDirs.flatMap((relativeDir) =>
    walkJsonFiles(path.join(projectRoot, relativeDir)).flatMap((sourcePath) => {
      try {
        const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
        return data && typeof data === "object"
          ? [{ sourcePath, data: data as Record<string, unknown> }]
          : [];
      } catch {
        return [];
      }
    })
  );
}

export function readProjectEvents(projectRoot: string): EventEnvelope[] {
  return readEvents(eventsPathFor(projectRoot));
}

export function payloadObject(event: EventEnvelope): Record<string, unknown> {
  const payload = (event as { payload?: unknown }).payload;
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
}

export function eventType(event: EventEnvelope): string {
  return String((event as { type?: unknown }).type ?? "");
}

export function artifactExists(projectRoot: string, artifactPath: unknown): boolean {
  if (typeof artifactPath !== "string" || artifactPath.trim().length === 0) return false;
  const resolved = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.join(projectRoot, artifactPath);
  return fs.existsSync(resolved);
}

export function stringValues(value: unknown): string[] {
  if (typeof value === "string" && value.trim().length > 0) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

export function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}
