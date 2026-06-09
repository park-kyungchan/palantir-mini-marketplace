// palantir-mini — per-project primitive RID minting (register seam helper).
// PURE + STABLE: identical inputs → identical rid (load-bearing for idempotent fold).

import { test, expect, describe } from "bun:test";
import {
  kebab,
  projectSlug,
  projectPrimitiveRid,
} from "../../lib/actions/project-primitive-rid";

describe("kebab", () => {
  test("lowercases, replaces non-alphanumeric runs with '-', collapses, trims", () => {
    expect(kebab("Record Progress")).toBe("record-progress");
    expect(kebab("Completion Rate!!")).toBe("completion-rate");
    expect(kebab("  Student  ")).toBe("student");
    expect(kebab("A//B__C")).toBe("a-b-c");
    expect(kebab("Linear Function (slope)")).toBe("linear-function-slope");
    expect(kebab("---weird---")).toBe("weird");
    expect(kebab("ABC")).toBe("abc");
  });
});

describe("projectSlug", () => {
  test("is the kebab of the project root's basename", () => {
    expect(projectSlug("/tmp/My Project")).toBe("my-project");
    expect(projectSlug("/a/b/Linear_Function_KG")).toBe("linear-function-kg");
  });
});

describe("projectPrimitiveRid", () => {
  test("stability: same inputs → identical rid", () => {
    const a = projectPrimitiveRid("/tmp/proj-a", "object-type", "Student");
    const b = projectPrimitiveRid("/tmp/proj-a", "object-type", "Student");
    expect(a).toBe(b);
  });

  test("namespaced shape: projectSlug/kind/kebab(plainName)", () => {
    expect(projectPrimitiveRid("/tmp/Proj A", "object-type", "Record Progress"))
      .toBe("proj-a/object-type/record-progress");
    expect(projectPrimitiveRid("/tmp/Proj A", "action-type", "Record Progress"))
      .toBe("proj-a/action-type/record-progress");
    expect(projectPrimitiveRid("/tmp/Proj A", "function", "Completion Rate"))
      .toBe("proj-a/function/completion-rate");
    expect(projectPrimitiveRid("/tmp/Proj A", "link-type", "Attends"))
      .toBe("proj-a/link-type/attends");
  });

  test("distinct plainNames → distinct rids", () => {
    const student = projectPrimitiveRid("/tmp/p", "object-type", "Student");
    const lesson = projectPrimitiveRid("/tmp/p", "object-type", "Lesson");
    expect(student).not.toBe(lesson);
  });

  test("distinct kinds for same name → distinct rids", () => {
    const asObject = projectPrimitiveRid("/tmp/p", "object-type", "Thing");
    const asAction = projectPrimitiveRid("/tmp/p", "action-type", "Thing");
    expect(asObject).not.toBe(asAction);
  });

  test("distinct projects for same name → distinct rids (per-project isolation)", () => {
    const inP = projectPrimitiveRid("/tmp/proj-a", "object-type", "Student");
    const inQ = projectPrimitiveRid("/tmp/proj-b", "object-type", "Student");
    expect(inP).not.toBe(inQ);
  });

  test("slug-collision (two names kebab-equal) → same rid (documented dedup)", () => {
    const a = projectPrimitiveRid("/tmp/p", "object-type", "Linear Function");
    const b = projectPrimitiveRid("/tmp/p", "object-type", "linear  function");
    expect(a).toBe(b);
  });
});
