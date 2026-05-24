import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { resolveResearchAnchor } from "../../lib/runtime-overlay/research-core-select";
import { resolveSchemaPath } from "../../lib/runtime-overlay/schema-resolve";
import { resolveSharedCorePath } from "../../lib/runtime-overlay/shared-core-resolve";

const PLUGIN_ROOT = "/home/palantirkc/.claude/plugins/palantir-mini";

function walkTs(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("plugin-contained runtime substrate", () => {
  test("default resolvers use plugin-owned snapshots", async () => {
    const previousForce = process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
    const previousExternal = process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
    delete process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
    delete process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
    try {
      const research = await resolveResearchAnchor("AIP #3/#4", "palantir-foundry");
      expect(research.source).toBe("plugin-snapshot");
      expect(research.authorityMode).toBe("plugin-portable");
      expect(research.ssotSatisfied).toBe(true);
      expect(research.sourceReadiness).toBe("ready");
      expect(research.files.every((file) => file.path.includes("runtime-overlay/research-library"))).toBe(true);
    } finally {
      if (previousForce === undefined) delete process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
      else process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH = previousForce;
      if (previousExternal === undefined) delete process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
      else process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH = previousExternal;
    }

    const schema = await resolveSchemaPath();
    expect(schema.source).toBe("plugin-snapshot");
    expect(schema.resolvedPath).toContain("runtime-overlay/schemas-snapshot");

    const sharedCore = resolveSharedCorePath();
    expect(sharedCore.source).toBe("plugin-snapshot");
    expect(sharedCore.resolvedPath).toContain("runtime-overlay/ontology-shared-core");
  });

  test("snapshots include AIP #3/#4 research, schema registry, and shared-core", () => {
    expect(
      fs.existsSync(
        path.join(
          PLUGIN_ROOT,
          "runtime-overlay/research-library/palantir-foundry/architecture/architecture-center-aip-architecture.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          PLUGIN_ROOT,
          "runtime-overlay/research-library/palantir-foundry/architecture/architecture-center-ontology-system.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(PLUGIN_ROOT, "runtime-overlay/schemas-snapshot/src/generated/rule-registry.ts"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(PLUGIN_ROOT, "runtime-overlay/ontology-shared-core/index.ts")),
    ).toBe(true);
  });

  test("portable snapshot includes research root and palantir-official anchors", async () => {
    const previousForce = process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
    const previousExternal = process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
    delete process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
    delete process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
    try {
      const root = await resolveResearchAnchor("global research router", "research-root");
      expect(root.source).toBe("plugin-snapshot");
      expect(root.files.every((file) => file.path.includes("runtime-overlay/research-library/research-root"))).toBe(true);
      expect(root.files.every((file) => file.exists)).toBe(true);

      const official = await resolveResearchAnchor("Palantir AIP Architecture and Ontology", "palantir-official");
      expect(official.source).toBe("plugin-snapshot");
      expect(official.authorityMode).toBe("plugin-portable");
      expect(official.ssotSatisfied).toBe(true);
      expect(official.files.every((file) => file.path.includes("runtime-overlay/research-library/palantir-official"))).toBe(true);
      expect(official.files.every((file) => file.exists)).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            PLUGIN_ROOT,
            "runtime-overlay/research-library/palantir-official/foundry/architecture-center/aip-architecture.md",
          ),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            PLUGIN_ROOT,
            "runtime-overlay/research-library/palantir-official/foundry/ontology/overview.md",
          ),
        ),
      ).toBe(true);
    } finally {
      if (previousForce === undefined) delete process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH;
      else process.env.PALANTIR_MINI_PREFER_PLUGIN_RESEARCH = previousForce;
      if (previousExternal === undefined) delete process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH;
      else process.env.PALANTIR_MINI_DEV_PREFER_EXTERNAL_RESEARCH = previousExternal;
    }
  });

  test("external-required authority mode reports blocked SSoT when external anchors are missing", async () => {
    const result = await resolveResearchAnchor(
      "missing external official docs authority",
      "missing-topic-for-authority-mode-test",
      { authorityMode: "external-required" },
    );

    expect(result.authorityMode).toBe("external-required");
    expect(result.source).toBe("plugin-snapshot");
    expect(result.ssotSatisfied).toBe(false);
    expect(result.sourceReadiness).toBe("blocked");
    expect(result.currentnessGap).toContain("does not prove live official-doc freshness");
  });

  test("schema snapshot is not older than the external authoring mirror when present", () => {
    const snapshotPkg = JSON.parse(
      fs.readFileSync(
        path.join(PLUGIN_ROOT, "runtime-overlay/schemas-snapshot/package.json"),
        "utf8",
      ),
    ) as { version: string };
    const externalPkgPath = "/home/palantirkc/.claude/schemas/package.json";
    if (!fs.existsSync(externalPkgPath)) return;
    const externalPkg = JSON.parse(fs.readFileSync(externalPkgPath, "utf8")) as { version: string };
    expect(snapshotPkg.version).toBe(externalPkg.version);
  });

  test("plugin TypeScript imports do not directly reach out to external schemas", () => {
    const files = ["bridge", "lib", "hooks", "scripts", "skills"]
      .flatMap((dir) => walkTs(path.join(PLUGIN_ROOT, dir)));
    const violations: string[] = [];
    const importPattern = /from\s+["'](?:\.\.\/)+schemas\/|import\(\s*["'](?:\.\.\/)+schemas\//;
    const absoluteSchemaRead = /(?:readFileSync|existsSync|path\.(?:join|resolve))\([^)]*(?:\/home\/palantirkc\/\.claude\/schemas|\/home\/palantirkc\/ontology\/shared-core)/;

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (importPattern.test(source) || absoluteSchemaRead.test(source)) {
        violations.push(path.relative(PLUGIN_ROOT, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
