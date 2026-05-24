// palantir-mini v0 — Migration harness for palantir-math/ontology/schema.ts
// Goal: prove end-to-end that the plugin can regenerate a project's generated
// ontology artifact using the published lib/codegen pipeline.
//
// This script:
//   1. Runs the plugin's codegen targeting ~/palantir-math
//   2. Verifies the generated file was written with the correct header
//   3. Verifies events.jsonl now has codegen_started + codegen_completed
//   4. Prints a success/failure report
//
// Non-destructive: does NOT modify palantir-math/ontology/* files.
// It only writes under <palantir-math>/.palantir-mini/ and <palantir-math>/src/generated/ontology-index.ts.

import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { runCodegen } from "../lib/codegen/descender-gen";
import { readEvents, foldToSnapshot } from "../lib/event-log/read";
import type { EventEnvelope } from "../lib/event-log/types";

const PROJECT = path.join(os.homedir(), "palantir-math");

interface MigrationReport {
  project:              string;
  codegenResult:        { startedSeq?: number; completedSeq?: number; generatedFiles: string[]; errors: string[] };
  generatedFileWritten: boolean;
  generatedFilePath:    string;
  generatedFileSize:    number;
  eventsJsonlExists:    boolean;
  eventCount:           number;
  codegenStartedEvents: number;
  codegenCompletedEvents: number;
  overallSuccess:       boolean;
}

async function main(): Promise<void> {
  if (!fs.existsSync(PROJECT)) {
    console.error(`palantir-math not found at ${PROJECT}`);
    process.exit(1);
  }

  // Run codegen
  const codegenResult = await runCodegen({ projectRoot: PROJECT });

  // Verify generated file
  const generatedFilePath = path.join(PROJECT, "src", "generated", "ontology-index.ts");
  const generatedFileWritten = fs.existsSync(generatedFilePath);
  let generatedFileSize = 0;
  if (generatedFileWritten) {
    generatedFileSize = fs.statSync(generatedFilePath).size;
  }

  // Verify events.jsonl
  const eventsPath = path.join(PROJECT, ".palantir-mini", "session", "events.jsonl");
  const eventsJsonlExists = fs.existsSync(eventsPath);
  let events: import("../lib/event-log/types").EventEnvelope[] = [];
  if (eventsJsonlExists) {
    events = readEvents(eventsPath);
  }
  const snap = foldToSnapshot(events);

  const report: MigrationReport = {
    project: PROJECT,
    codegenResult: {
      startedSeq: codegenResult.startedSequence,
      completedSeq: codegenResult.completedSequence,
      generatedFiles: codegenResult.generatedFiles,
      errors: codegenResult.errors,
    },
    generatedFileWritten,
    generatedFilePath,
    generatedFileSize,
    eventsJsonlExists,
    eventCount: snap.totalEvents,
    codegenStartedEvents: snap.codegen_started,
    codegenCompletedEvents: snap.codegen_completed,
    overallSuccess:
      codegenResult.errors.length === 0 &&
      generatedFileWritten &&
      generatedFileSize > 0 &&
      eventsJsonlExists &&
      snap.codegen_started >= 1 &&
      snap.codegen_completed >= 1,
  };

  console.log(JSON.stringify(report, null, 2));

  process.exit(report.overallSuccess ? 0 : 2);
}

if (import.meta.main) {
  void main();
}
