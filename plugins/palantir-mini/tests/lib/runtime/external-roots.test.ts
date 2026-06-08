import { describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import { resolveExternalRoots } from "../../../lib/runtime/external-roots";

describe("resolveExternalRoots", () => {
  test("defaults the overlay base to <home>/.claude and derives the subroots", () => {
    const roots = resolveExternalRoots({ HOME: "/home/tester" });
    expect(roots.homeDir).toBe("/home/tester");
    expect(roots.overlayDir).toBe(path.join("/home/tester", ".claude"));
    expect(roots.rulesDir).toBe(path.join("/home/tester", ".claude", "rules"));
    expect(roots.researchOfficialDir).toBe(
      path.join("/home/tester", ".claude", "research", "palantir-official"),
    );
    expect(roots.schemasPrimitivesDir).toBe(
      path.join("/home/tester", ".claude", "schemas", "ontology", "primitives"),
    );
    expect(roots.projectsDir).toBe(path.join("/home/tester", ".claude", "projects"));
  });

  test("PALANTIR_MINI_EXTERNAL_OVERLAY_DIR repoints the whole overlay (non-Claude host)", () => {
    const roots = resolveExternalRoots({
      HOME: "/home/tester",
      PALANTIR_MINI_EXTERNAL_OVERLAY_DIR: "/srv/overlay",
    });
    expect(roots.overlayDir).toBe("/srv/overlay");
    expect(roots.rulesDir).toBe(path.join("/srv/overlay", "rules"));
    expect(roots.projectsDir).toBe(path.join("/srv/overlay", "projects"));
  });

  test("falls back to os.homedir() when HOME is blank (no hardcoded operator literal)", () => {
    const roots = resolveExternalRoots({ HOME: "  " });
    expect(roots.homeDir).toBe(os.homedir());
  });
});
