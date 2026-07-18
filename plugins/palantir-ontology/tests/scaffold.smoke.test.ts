// Scaffold smoke test (ledger row P320). Proves the test harness itself is
// wired (bun test discovers and runs a file) at a stage where there is no
// semantic-core logic yet to exercise. Real fixtures land under
// tests/{fixtures,parity,migration,negative}/ from P330 onward — see
// BROWSE.md for the per-directory wave map.
import { describe, expect, test } from "bun:test";
import packageJson from "../package.json";

describe("scaffold", () => {
  test("package.json identifies this plugin", () => {
    expect(packageJson.name).toBe("palantir-ontology");
    expect(packageJson.private).toBe(true);
  });
});
