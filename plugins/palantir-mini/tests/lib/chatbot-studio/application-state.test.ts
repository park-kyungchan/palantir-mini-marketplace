// palantir-mini PR-13 — application-state pin/apply tests
import { describe, test, expect } from "bun:test";
import {
  pinApplicationStateForReasoningLoop,
  applyApplicationStateUpdate,
  readVariableForLoop,
  type ReasoningLoopApplicationState,
} from "../../../lib/chatbot-studio/application-state";

const seed: ReasoningLoopApplicationState = {
  variables: [
    {
      variableId: "user_topic",
      kind: "string",
      description: "current topic",
      currentValue: "apples",
      updatePolicy: "deterministic-tool",
    },
    {
      variableId: "doc_set",
      kind: "object-set",
      description: "matched docs",
      currentValue: [],
      updatePolicy: "citation",
    },
  ],
  pinned: [],
};

describe("application-state pin/apply", () => {
  test("pinApplicationStateForReasoningLoop snapshots current values", () => {
    const pinned = pinApplicationStateForReasoningLoop(seed, "loop-1");
    expect(pinned.pinned.length).toBe(1);
    expect(pinned.pinned[0]!.loopId).toBe("loop-1");
    expect(pinned.pinned[0]!.variables.user_topic).toBe("apples");
    // original seed is not mutated
    expect(seed.pinned.length).toBe(0);
  });

  test("applyApplicationStateUpdate changes currentValue but not pinned snapshot", () => {
    const pinned = pinApplicationStateForReasoningLoop(seed, "loop-1");
    const after = applyApplicationStateUpdate(pinned, {
      variableId: "user_topic",
      nextValue: "bananas",
    });
    // Pinned snapshot still has the original value
    expect(after.pinned[0]!.variables.user_topic).toBe("apples");
    // currentValue is updated
    const userTopic = after.variables.find((v) => v.variableId === "user_topic");
    expect(userTopic?.currentValue).toBe("bananas");
  });

  test("readVariableForLoop returns pinned value when loop-id matches", () => {
    const pinned = pinApplicationStateForReasoningLoop(seed, "loop-1");
    const after = applyApplicationStateUpdate(pinned, {
      variableId: "user_topic",
      nextValue: "bananas",
    });
    // Even though currentValue is "bananas", the pinned loop-1 value is "apples"
    expect(readVariableForLoop(after, "loop-1", "user_topic")).toBe("apples");
  });

  test("readVariableForLoop falls back to currentValue when loop-id not pinned", () => {
    const after = applyApplicationStateUpdate(seed, {
      variableId: "user_topic",
      nextValue: "bananas",
    });
    expect(readVariableForLoop(after, "unknown-loop", "user_topic")).toBe("bananas");
  });
});
