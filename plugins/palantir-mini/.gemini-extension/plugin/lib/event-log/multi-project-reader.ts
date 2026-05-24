/**
 * palantir-mini v3.10.0 — multi-project-reader (W5.0a, P5)
 * @owner palantirkc-plugin-events
 * @purpose Cross-project event-stream discovery + read for pm_workflow_lineage_query.
 */
// Per harness-base-mode blueprint §4-P5 + cold-start §3 W5.0a + plan §3 W5.0a.
//
// Discovery strategy (Plan agent §5 hybrid — DO NOT auto-write):
//   1. Read ~/.claude/plugins/palantir-mini/session/registered-projects.json
//      (canonical SSoT maintained by project_register MCP handler)
//   2. ALSO scan ~/projects/* (or opts.projectsRoot) for any project with
//      .palantir-mini/session/events.jsonl that ISN'T in the registry
//   3. Return both sets as {registered, discovered} so the caller can
//      decide whether to auto-register (out of scope for this read path —
//      handler emits advisory event; never writes to registered-projects.json
//      from a query handler per Plan agent §5 read/write separation).
//
// Read strategy: per-project readEvents() (already auto-merges archive/
// events-rotated-* per rule 10 G3) + annotate each envelope with
// __sourceProject + concat + sort by (when, sequence) ASC for cross-project
// replay-order.
//
// Authority: ~/.claude/plans/glowing-frolicking-raven.md §3 W5.0a
//            ~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md §4-P5

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readEvents } from "./read";
import type { EventEnvelope } from "./types";

export interface ProjectEntry {
  /** Optional registration RID (only present when source="registered") */
  rid?: string;
  /** Absolute path to project root */
  projectPath: string;
  /** Resolved absolute path to .palantir-mini/session/events.jsonl */
  eventsJsonlPath: string;
  /** Discovery source */
  source: "registered" | "discovered";
  /** Human-readable label (only when source="registered") */
  label?: string;
}

export interface DiscoverProjectsOptions {
  /**
   * Root dir to scan for fs-walk fallback. Default: $HOME/projects.
   * Per-project layout: <projectsRoot>/<project>/.palantir-mini/session/events.jsonl
   */
  projectsRoot?: string;
  /**
   * Override path to registered-projects.json. Default:
   *   ~/.claude/plugins/palantir-mini/session/registered-projects.json
   */
  registryPath?: string;
}

export interface DiscoverProjectsResult {
  /** Projects found in registered-projects.json */
  registered: ProjectEntry[];
  /** Projects found in fs walk that ARE NOT in the registry */
  discovered: ProjectEntry[];
}

interface RegistrationFile {
  registrations?: Array<{
    rid?:         string;
    projectPath?: string;
    peerDepPin?:  string;
    label?:       string;
    registeredAt?: string;
  }>;
}

/**
 * Resolve the canonical registry path. Honors PALANTIR_MINI_REGISTRY env
 * override for test isolation.
 */
function resolveRegistryPath(opts?: DiscoverProjectsOptions): string {
  if (opts?.registryPath) return opts.registryPath;
  const envOverride = process.env.PALANTIR_MINI_REGISTRY;
  if (envOverride && path.isAbsolute(envOverride)) return envOverride;
  return path.join(
    os.homedir(),
    ".claude",
    "plugins",
    "palantir-mini",
    "session",
    "registered-projects.json",
  );
}

/** Resolve the canonical projects root for fs-walk fallback. */
function resolveProjectsRoot(opts?: DiscoverProjectsOptions): string {
  if (opts?.projectsRoot && path.isAbsolute(opts.projectsRoot)) return opts.projectsRoot;
  const envOverride = process.env.PALANTIR_MINI_PROJECTS_ROOT;
  if (envOverride && path.isAbsolute(envOverride)) return envOverride;
  return path.join(os.homedir(), "projects");
}

/** Read the registry file. Returns empty array on missing/malformed. */
function readRegistry(registryPath: string): ProjectEntry[] {
  if (!fs.existsSync(registryPath)) return [];
  try {
    const raw = fs.readFileSync(registryPath, "utf8");
    const obj = JSON.parse(raw) as RegistrationFile | RegistrationFile["registrations"];
    // Tolerate two shapes: {registrations: [...]} OR direct array
    const entries = Array.isArray(obj)
      ? (obj as RegistrationFile["registrations"]) ?? []
      : obj?.registrations ?? [];

    const out: ProjectEntry[] = [];
    for (const e of entries ?? []) {
      if (!e?.projectPath || typeof e.projectPath !== "string") continue;
      out.push({
        rid: e.rid,
        projectPath: e.projectPath,
        eventsJsonlPath: path.join(e.projectPath, ".palantir-mini", "session", "events.jsonl"),
        source: "registered",
        label: e.label,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Scan projectsRoot for projects with .palantir-mini/session/events.jsonl. */
function scanFilesystem(projectsRoot: string, registeredPaths: Set<string>): ProjectEntry[] {
  if (!fs.existsSync(projectsRoot)) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(projectsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const discovered: ProjectEntry[] = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const projectPath = path.resolve(projectsRoot, ent.name);
    if (registeredPaths.has(projectPath)) continue; // dedup with registry
    const eventsJsonlPath = path.join(projectPath, ".palantir-mini", "session", "events.jsonl");
    if (!fs.existsSync(eventsJsonlPath)) continue;
    discovered.push({
      projectPath,
      eventsJsonlPath,
      source: "discovered",
    });
  }
  return discovered;
}

/**
 * Discover known palantir-mini projects via registry + fs walk.
 * Returns BOTH sets so caller can route advisory events for unregistered.
 */
export function discoverProjects(opts?: DiscoverProjectsOptions): DiscoverProjectsResult {
  const registryPath = resolveRegistryPath(opts);
  const projectsRoot = resolveProjectsRoot(opts);
  const registered = readRegistry(registryPath);
  const registeredPaths = new Set(registered.map((p) => p.projectPath));
  const discovered = scanFilesystem(projectsRoot, registeredPaths);
  return { registered, discovered };
}

/** Annotated envelope shape for cross-project queries. */
export type AnnotatedEvent = EventEnvelope & { __sourceProject: string };

export interface ReadMultiProjectResult {
  /** All events from all projects, sorted by (when, sequence) ASC. */
  events: AnnotatedEvent[];
  /** Per-project event counts keyed by absolute project path. */
  perProjectCounts: Record<string, number>;
}

/**
 * Read events from N projects + merge by (when, sequence) ASC for cross-
 * project replay-order. Each envelope is annotated with __sourceProject so
 * downstream consumers can group/filter without re-reading.
 *
 * Best-effort: missing events.jsonl per project = 0 events for that project,
 * not a thrown error.
 */
export function readMultiProjectEvents(projects: ProjectEntry[]): ReadMultiProjectResult {
  const allEvents: AnnotatedEvent[] = [];
  const perProjectCounts: Record<string, number> = {};

  for (const project of projects) {
    const events = readEvents(project.eventsJsonlPath);
    perProjectCounts[project.projectPath] = events.length;
    for (const ev of events) {
      // Defensive normalization: malformed legacy events (e.g. one codex emit
      // from 2026-04-25 used {event,timestamp,actor} instead of canonical
      // 5-dim envelope, lacking byWhom/throughWhich) are skipped here so all
      // downstream consumers see a uniform shape. Rule 10 §append-only
      // forbids rewriting events.jsonl rows — defensive-read at the chokepoint
      // is the only safe path. Skipped events still count toward
      // perProjectCounts (visible to caller for advisory).
      if (!ev || typeof ev !== "object") continue;
      if (!ev.byWhom || typeof ev.byWhom !== "object") continue;
      if (!ev.throughWhich || typeof ev.throughWhich !== "object") continue;
      if (typeof ev.when !== "string") continue;
      allEvents.push({ ...ev, __sourceProject: project.projectPath });
    }
  }

  // Sort by (when, sequence) ASC — cross-project replay-order.
  allEvents.sort((a, b) => {
    if (a.when < b.when) return -1;
    if (a.when > b.when) return 1;
    return (a.sequence ?? 0) - (b.sequence ?? 0);
  });

  return { events: allEvents, perProjectCounts };
}
