// palantir-mini v3.5.0 — pm-preamble sibling: type definitions
// v3.5.0 N1-LARGE wave 3 decomposition (was bridge/handlers/pm-preamble.ts 213 LOC).

import type { Config } from "../../../lib/config";

export interface PmPreambleArgs {
  skillName: string;
  projectRoot?: string;
}

export interface LearningRef {
  topic: string;
  content: string;
  confidence: number;
}

export interface PmPreambleResult {
  sessionMinutes: number;
  concurrentProjects: number;
  explainLevel: Config["explainLevel"];
  proactive: Config["proactive"];
  skillPrefix: Config["skillPrefix"];
  learningsCount: number;
  recentLearnings: LearningRef[];
  branch: string;
  repoMode: Config["repoMode"];
}
