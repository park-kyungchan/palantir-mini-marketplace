import * as fs from "fs";
import * as path from "path";
import {
  createContextCapsule,
  persistContextCapsule,
} from "../lib/context/context-capsule";
import {
  readCurrentUniversalOntologyEntry,
  universalOntologyEntryRef,
} from "../lib/ontology-entry/entry-store";
import { resolveCaptureProjectRoot, promptFrontDoorRoot } from "./prompt-front-door-capture";

interface HookPayload {
  readonly session_id?: string;
  readonly cwd?: string;
  readonly prompt?: string;
}

interface PromptPointer {
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
}

function readPromptPointer(projectRoot: string, sessionId?: string): PromptPointer | null {
  if (!sessionId) return null;
  const currentDir = path.join(promptFrontDoorRoot(projectRoot), "current");
  if (!fs.existsSync(currentDir)) return null;
  for (const entry of fs.readdirSync(currentDir)) {
    if (!entry.endsWith(`${sessionId}.json`)) continue;
    try {
      return JSON.parse(fs.readFileSync(path.join(currentDir, entry), "utf8")) as PromptPointer;
    } catch {
      return null;
    }
  }
  return null;
}

export default async function contextCapsuleInit(payload: unknown): Promise<{
  message: string;
  additionalContext?: string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const projectRoot = resolveCaptureProjectRoot(cwd);
  const pointer = readPromptPointer(projectRoot, p.session_id);
  const currentEntry = readCurrentUniversalOntologyEntry(projectRoot);
  const capsule = createContextCapsule({
    purpose: "subagent-handoff",
    projectRoot,
    promptId: pointer?.promptId,
    sessionId: pointer?.sessionId ?? p.session_id,
    universalOntologyEntryRef: currentEntry ? universalOntologyEntryRef(currentEntry) : undefined,
    notes: [
      pointer?.promptHash
        ? `promptHash=${pointer.promptHash}`
        : "prompt-front-door pointer unavailable at capsule init",
      currentEntry
        ? `universalOntologyEntry=${currentEntry.entryId}`
        : "universal ontology entry unavailable at capsule init",
      typeof p.prompt === "string" ? `promptLength=${p.prompt.length}` : "promptLength=unknown",
    ],
  });
  const capsulePath = await persistContextCapsule(capsule, projectRoot);
  return {
    message: `palantir-mini: context capsule initialized (${capsule.capsuleId})`,
    additionalContext: `palantir-mini context capsule persisted: ${capsulePath}`,
  };
}
