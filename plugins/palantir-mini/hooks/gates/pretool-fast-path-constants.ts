// palantir-mini — shared fast-path detection constants for the PreToolUse gate
// entry files (hooks/ontology-engineering-workflow-enforcement-gate.ts and
// hooks/prompt-dtc-enforcement-gate.ts). Single source of truth: the thin entry
// files import these directly (cheap, no impl module graph); the impl modules
// import them back from here (no duplication).
//
// Moved verbatim from hooks/ontology-engineering-workflow-enforcement-gate.ts
// during the gate-split refactor (thin entry + dynamic-import impl).

export const LEGACY_RUNTIME_UI_TOKENS = [
  ["Ask", "User", "Question"].join(""),
  ["request", "user", "input"].join("_"),
  ["manual", "review", "card"].join("-"),
  ["ask", "UserQuestionQueue"].join(""),
  ["ask", "UserQuestionPayload"].join(""),
  ["runtime", "QuestionUi"].join(""),
] as const;

export const ONTOLOGY_ENGINEERING_MARKERS = [
  "ontology engineering",
  "ontology-engineering",
  "ontologyengineering",
  "fdeontologyengineering",
  "fde-ontology-engineering",
  "workflowcontract",
  "turncarddecisionspec",
  "userdecisionrecord",
  "pm_ontology_engineering_workflow",
  "ontology-engineering-workflow",
  "semanticintentcontract",
  "digitaltwinchangecontract",
] as const;
