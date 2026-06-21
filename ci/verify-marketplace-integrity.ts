import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findSemanticRootForks } from "../plugins/palantir-mini/scripts/verify-no-semantic-root-fork";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const PLUGIN_ROOT = join(REPOSITORY_ROOT, "plugins", "palantir-mini");

function assert(condition: unknown, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
}

function main(): void {
  const errors: string[] = [];
  const marketplaceManifest = join(REPOSITORY_ROOT, ".agents", "plugins", "marketplace.json");
  const pluginManifest = join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
  const ssotAuthority = join(PLUGIN_ROOT, ".ssot-authority.json");

  assert(existsSync(marketplaceManifest), ".agents/plugins/marketplace.json is missing", errors);
  assert(existsSync(pluginManifest), "plugins/palantir-mini/.codex-plugin/plugin.json is missing", errors);
  assert(existsSync(ssotAuthority), "plugins/palantir-mini/.ssot-authority.json is missing", errors);

  if (existsSync(ssotAuthority)) {
    const marker = JSON.parse(readFileSync(ssotAuthority, "utf8")) as {
      authority?: string;
      upstreamAuthority?: string;
    };
    assert(
      marker.authority === "/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini",
      ".ssot-authority.json authority must point at the canonical local plugin source",
      errors,
    );
    assert(
      marker.upstreamAuthority === "github:park-kyungchan/palantir-mini-marketplace:plugins/palantir-mini",
      ".ssot-authority.json upstreamAuthority must point at the marketplace plugin path",
      errors,
    );
  }

  for (const finding of findSemanticRootForks(REPOSITORY_ROOT)) {
    errors.push(`${finding.path}: ${finding.message}`);
  }

  type VersionedManifest = {
    version?: string;
    metadata?: { version?: string };
    plugins?: Array<{ version?: string }>;
  };
  const canonicalPlugin = JSON.parse(
    readFileSync(join(PLUGIN_ROOT, ".claude-plugin", "plugin.json"), "utf8"),
  ) as VersionedManifest;
  const canonical = canonicalPlugin.version;
  if (typeof canonical !== "string") {
    errors.push("plugins/palantir-mini/.claude-plugin/plugin.json is missing a string version");
  } else {
    const checkVersion = (filePath: string, jsonPath: string, found: unknown): void => {
      const rel = relative(REPOSITORY_ROOT, filePath);
      assert(
        found === canonical,
        `version mismatch: ${rel}[${jsonPath}] ${found} != ${canonical}`,
        errors,
      );
    };
    const rootMarketplace = join(REPOSITORY_ROOT, ".claude-plugin", "marketplace.json");
    const pluginMarketplace = join(PLUGIN_ROOT, ".claude-plugin", "marketplace.json");
    const codexManifest = join(PLUGIN_ROOT, ".codex-plugin", "plugin.json");
    const packageManifest = join(PLUGIN_ROOT, "package.json");
    for (const marketplacePath of [rootMarketplace, pluginMarketplace]) {
      const manifest = JSON.parse(readFileSync(marketplacePath, "utf8")) as VersionedManifest;
      checkVersion(marketplacePath, ".metadata.version", manifest.metadata?.version);
      checkVersion(marketplacePath, ".plugins[0].version", manifest.plugins?.[0]?.version);
      checkVersion(marketplacePath, ".version", manifest.version);
    }
    const codex = JSON.parse(readFileSync(codexManifest, "utf8")) as VersionedManifest;
    checkVersion(codexManifest, ".version", codex.version);
    const pkg = JSON.parse(readFileSync(packageManifest, "utf8")) as VersionedManifest;
    checkVersion(packageManifest, ".version", pkg.version);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[marketplace-integrity] ${error}`);
    process.exit(1);
  }
  console.log("[marketplace-integrity] OK: marketplace root and plugin source authority are intact");
}

main();
