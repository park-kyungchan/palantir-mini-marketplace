// palantir-mini v3.7.0 — subagent-start-env-inject test fixtures
// Shared between main + side-effects + hook test siblings (A.4 decomposition).

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function makeTmpDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-ss-${label}-`));
}

export function writeAgentMd(root: string, name: string, body: string): string {
  const dir = path.join(root, ".claude", "agents");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.md`);
  fs.writeFileSync(file, body, "utf8");
  return file;
}

export const AGENT_WITH_ENV = `---
name: test-agent
description: test
model: sonnet
tools:
  - Read
env:
  MY_VAR: "hello"
  ANOTHER_VAR: world
  QUOTED_SINGLE: 'single'
---

Body content.
`;

export const AGENT_NO_ENV = `---
name: no-env-agent
description: test
model: sonnet
tools:
  - Read
---

Body.
`;

export const AGENT_EMPTY_ENV = `---
name: empty-env-agent
description: test
model: sonnet
tools:
  - Read
env:
maxTurns: 20
---

Body.
`;

export const AGENT_NO_FRONTMATTER = `No frontmatter here.
Just plain text.
`;

export const AGENT_ENV_WITH_EMPTY_VALUE = `---
name: empty-val-agent
description: test
model: sonnet
tools:
  - Read
env:
  EMPTY_VAR: ""
  ANOTHER: set
---

Body.
`;
