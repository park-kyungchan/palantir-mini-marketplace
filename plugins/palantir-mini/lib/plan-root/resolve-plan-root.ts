import * as os from "node:os";
import * as path from "node:path";

export const CANONICAL_PLAN_RELATIVE_DIR = path.join(".palantir-mini", "plan");
export const LEGACY_CLAUDE_PLAN_RELATIVE_DIR = path.join(".claude", "plans");

export interface PlanRootOptions {
  projectRoot?: string;
  cwd?: string;
  home?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

function envFor(options: PlanRootOptions): NodeJS.ProcessEnv | Record<string, string | undefined> {
  return options.env ?? process.env;
}

function homeFor(options: PlanRootOptions): string {
  return options.home ?? envFor(options).HOME ?? os.homedir();
}

function projectRootFor(options: PlanRootOptions): string {
  return path.resolve(options.projectRoot ?? options.cwd ?? process.cwd());
}

export function expandHomePath(inputPath: string, options: PlanRootOptions = {}): string {
  if (inputPath === "~") return homeFor(options);
  if (inputPath.startsWith("~/")) return path.join(homeFor(options), inputPath.slice(2));
  return inputPath;
}

export function resolveCanonicalPlanRoot(options: PlanRootOptions = {}): string {
  const override = envFor(options).PALANTIR_MINI_PLAN_DIR;
  if (override && override.trim().length > 0) {
    const expanded = expandHomePath(override.trim(), options);
    return path.isAbsolute(expanded)
      ? path.resolve(expanded)
      : path.resolve(projectRootFor(options), expanded);
  }
  return path.join(projectRootFor(options), CANONICAL_PLAN_RELATIVE_DIR);
}

export function resolveLegacyClaudePlanRoot(options: PlanRootOptions = {}): string {
  return path.join(homeFor(options), LEGACY_CLAUDE_PLAN_RELATIVE_DIR);
}

export function resolvePlanRoot(options: PlanRootOptions = {}): string {
  return resolveCanonicalPlanRoot(options);
}

function isInsidePath(absPath: string, absRoot: string): boolean {
  const relative = path.relative(absRoot, absPath);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

export function isCanonicalPlanPath(filePath: string, options: PlanRootOptions = {}): boolean {
  const absPath = path.resolve(projectRootFor(options), expandHomePath(filePath, options));
  return isInsidePath(absPath, resolveCanonicalPlanRoot(options));
}

export function isLegacyClaudePlanPath(filePath: string, options: PlanRootOptions = {}): boolean {
  const absPath = path.resolve(projectRootFor(options), expandHomePath(filePath, options));
  return isInsidePath(absPath, resolveLegacyClaudePlanRoot(options));
}

export function isPlanArtifactPath(filePath: string, options: PlanRootOptions = {}): boolean {
  return isCanonicalPlanPath(filePath, options) || isLegacyClaudePlanPath(filePath, options);
}

export function resolvePlanArtifactPath(fileName: string, options: PlanRootOptions = {}): string {
  return path.join(resolvePlanRoot(options), fileName);
}

