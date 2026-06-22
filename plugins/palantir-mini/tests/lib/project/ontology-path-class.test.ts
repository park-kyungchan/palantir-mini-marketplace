// palantir-mini — ontology-path-class shared predicate tests (bd-006 de-hardcode)
// Coverage: pathIsProjectOntologyClass returns true for each path-class segment,
// bare leading segments, mixed-case / backslash forms; false for non-ontology.

import { test, expect, describe } from "bun:test";
import {
  pathIsProjectOntologyClass,
  PROJECT_ONTOLOGY_PATH_CLASS_SEGMENTS,
} from "../../../lib/project/ontology-path-class";

describe("pathIsProjectOntologyClass", () => {
  test("returns true for each path-class segment", () => {
    for (const seg of PROJECT_ONTOLOGY_PATH_CLASS_SEGMENTS) {
      // seg is "/foo/" — embed it in a realistic path.
      const candidate = `/repo/projects/acme${seg}thing.ts`;
      expect(pathIsProjectOntologyClass(candidate)).toBe(true);
    }
  });

  test("matches representative segments explicitly", () => {
    expect(pathIsProjectOntologyClass("/x/ontology/a.ts")).toBe(true);
    expect(pathIsProjectOntologyClass("/x/object-type/a.ts")).toBe(true);
    expect(pathIsProjectOntologyClass("/x/object-types/a.ts")).toBe(true);
    expect(pathIsProjectOntologyClass("/x/action-types/a.ts")).toBe(true);
    expect(pathIsProjectOntologyClass("/x/shared-properties/a.ts")).toBe(true);
  });

  test("matches a bare leading segment", () => {
    expect(pathIsProjectOntologyClass("ontology/a.ts")).toBe(true);
  });

  test("matches mixed-case and backslash forms", () => {
    expect(pathIsProjectOntologyClass("C:\\proj\\Ontology\\a.ts")).toBe(true);
    expect(pathIsProjectOntologyClass("/X/Object-Type/A.ts")).toBe(true);
  });

  test("returns false for non-ontology paths", () => {
    expect(pathIsProjectOntologyClass("/x/src/foo.ts")).toBe(false);
    expect(pathIsProjectOntologyClass("/x/README.md")).toBe(false);
  });

  test("returns false for undefined and empty string", () => {
    expect(pathIsProjectOntologyClass(undefined)).toBe(false);
    expect(pathIsProjectOntologyClass("")).toBe(false);
  });
});
