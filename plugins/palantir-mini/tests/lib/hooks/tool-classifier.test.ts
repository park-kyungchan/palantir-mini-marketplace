import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  classifyHookTool,
  isAssignedReviewArtifactPath,
  isMcpFirstEvidenceToolName,
  isReadOnlyBashCommand,
  managedSettingsPalantirMiniMcpPattern,
  normalizePalantirMiniMcpToolName,
  palantirMiniMcpToolAliasesFor,
} from "../../../lib/hooks/tool-classifier";
import { MCP_TOOL_CAPABILITIES } from "../../../lib/capability-registry/mcp-tool-capability";

describe("classifyHookTool", () => {
  test("recognizes Claude/plugin and Codex MCP spellings for protected edit tools", () => {
    for (const toolName of [
      "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
      "mcp__palantir_mini__commit_edits",
      "mcp__palantir_mini__.commit_edits",
      "mcp__palantir-mini__commit_edits",
      "mcp__plugin_palantir-mini_palantir-mini__apply_edit_function",
      "mcp__palantir_mini__apply_edit_function",
      "mcp__palantir_mini__.apply_edit_function",
      "mcp__palantir-mini__apply_edit_function",
      "mcp_palantir-mini_apply_edit_function",
      "mcp_palantir_mini_apply_edit_function",
    ]) {
      const classification = classifyHookTool({ tool_name: toolName });
      expect(classification.isPalantirMiniMcpTool).toBe(true);
      expect(classification.isProtectedMutation).toBe(true);
      expect(classification.isDtcMutatingMcpTool).toBe(true);
      expect(classification.isOntologyAffectingForSelectiveBlocking).toBe(true);
    }
  });

  test("does not substring-match spoofed palantir-mini operation names", () => {
    for (const toolName of [
      "mcp__palantir_mini__not_commit_edits",
      "mcp__palantir_mini__commit_edits_extra",
      "mcp__palantir_mini__impact_query_backup",
      "my_commit_edits_wrapper",
    ]) {
      const classification = classifyHookTool({ tool_name: toolName });
      expect(classification.operation).toBe("unknown");
      expect(classification.isReadOnly).toBe(false);
      expect(classification.isProtectedMutation).toBe(false);
      expect(classification.isDtcMutatingMcpTool).toBe(false);
      expect(classification.isOntologyAffectingForSelectiveBlocking).toBe(false);
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(false);
    }
  });

  test("normalizes all supported palantir-mini MCP namespace spellings", () => {
    expect(normalizePalantirMiniMcpToolName("mcp__plugin_palantir-mini_palantir-mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir_mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir_mini__.emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp__palantir-mini__emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp_palantir-mini_emit_event"))
      .toBe("emit_event");
    expect(normalizePalantirMiniMcpToolName("mcp_palantir_mini_emit_event"))
      .toBe("emit_event");

    expect(palantirMiniMcpToolAliasesFor("mcp__palantir_mini__.emit_event")).toEqual([
      "mcp__plugin_palantir-mini_palantir-mini__emit_event",
      "mcp__palantir_mini__emit_event",
      "mcp__palantir_mini__.emit_event",
      "mcp__palantir-mini__emit_event",
      "mcp_palantir-mini_emit_event",
      "mcp_palantir_mini_emit_event",
    ]);
    expect(managedSettingsPalantirMiniMcpPattern("mcp__palantir_mini__.emit_event"))
      .toBe("mcp__palantir-mini__emit_event");
  });

  test("preserves exact read-only evidence operation aliases", () => {
    for (const { operation, toolNames } of [
      {
        operation: "impact_query",
        toolNames: [
          "impact_query",
          "mcp__plugin_palantir-mini_palantir-mini__impact_query",
          "mcp__palantir_mini__impact_query",
          "mcp__palantir_mini__.impact_query",
          "mcp__palantir-mini__impact_query",
          "mcp_palantir-mini_impact_query",
          "mcp_palantir_mini_impact_query",
        ],
      },
      {
        operation: "pre_edit_impact",
        toolNames: [
          "pre_edit_impact",
          "mcp__plugin_palantir-mini_palantir-mini__pre_edit_impact",
          "mcp__palantir_mini__pre_edit_impact",
          "mcp__palantir_mini__.pre_edit_impact",
          "mcp__palantir-mini__pre_edit_impact",
          "mcp_palantir-mini_pre_edit_impact",
          "mcp_palantir_mini_pre_edit_impact",
        ],
      },
      {
        operation: "get_ontology",
        toolNames: [
          "get_ontology",
          "mcp__plugin_palantir-mini_palantir-mini__get_ontology",
          "mcp__palantir_mini__get_ontology",
          "mcp__palantir_mini__.get_ontology",
          "mcp__palantir-mini__get_ontology",
          "mcp_palantir-mini_get_ontology",
          "mcp_palantir_mini_get_ontology",
        ],
      },
    ] as const) {
      for (const toolName of toolNames) {
        const classification = classifyHookTool({ tool_name: toolName });
        expect(classification.operation).toBe(operation);
        expect(classification.isReadOnly).toBe(true);
        expect(classification.isProtectedMutation).toBe(false);
        expect(isMcpFirstEvidenceToolName(toolName)).toBe(true);
      }
    }
  });

  test("keeps ontology_context_query read mode read-only and write mode protected", () => {
    expect(
      classifyHookTool({
        tool_name: "mcp__palantir_mini__ontology_context_query",
        tool_input: { action: "read" },
      }).isProtectedMutation,
    ).toBe(false);
    expect(
      classifyHookTool({
        tool_name: "mcp__palantir_mini__ontology_context_query",
        tool_input: { action: "write" },
      }).isProtectedMutation,
    ).toBe(true);
  });

  test("classifies Bash inspection separately from publish or commit mutation", () => {
    expect(isReadOnlyBashCommand("git status --short")).toBe(true);
    expect(isReadOnlyBashCommand("gh pr view 123")).toBe(true);
    expect(isReadOnlyBashCommand("git commit -m test")).toBe(false);
    expect(isReadOnlyBashCommand("gh pr merge 123 --squash")).toBe(false);
  });

  test("default-allows benign inspection Bash that the old first-token allowlist over-blocked", () => {
    // RELAXATION (bd-003): vocabulary no longer decides; absence of a write pattern => read-only.
    expect(isReadOnlyBashCommand("du -sh *")).toBe(true);
    expect(isReadOnlyBashCommand("jq '.x' f.json")).toBe(true);
    expect(isReadOnlyBashCommand("awk '{print $1}' f")).toBe(true);
    expect(isReadOnlyBashCommand("sort f | uniq -c")).toBe(true);
    expect(isReadOnlyBashCommand("ps aux | grep node")).toBe(true);
    expect(isReadOnlyBashCommand("stat f")).toBe(true);
    expect(isReadOnlyBashCommand("echo hi")).toBe(true);
    expect(isReadOnlyBashCommand("column -t f")).toBe(true);
    expect(isReadOnlyBashCommand("wc -l f")).toBe(true);
    expect(isReadOnlyBashCommand("comm -13 a b")).toBe(true);
    expect(isReadOnlyBashCommand("cat a | grep b | wc -l")).toBe(true);
  });

  test("UNDER-BLOCK guard: genuine mutating Bash still classifies as NOT read-only", () => {
    expect(isReadOnlyBashCommand("echo x > f")).toBe(false);
    expect(isReadOnlyBashCommand("sed -i s/a/b/ f")).toBe(false);
    expect(isReadOnlyBashCommand("perl -i -pe '...' f")).toBe(false);
    expect(isReadOnlyBashCommand("cat a | tee b")).toBe(false);
    expect(isReadOnlyBashCommand("cat a | sort > b")).toBe(false); // benign head, writing tail
    expect(isReadOnlyBashCommand("du -sh * | tee out")).toBe(false);
    expect(isReadOnlyBashCommand("git commit -m x")).toBe(false);
    expect(isReadOnlyBashCommand("git restore f")).toBe(false);
    expect(isReadOnlyBashCommand("rm f")).toBe(false);
    expect(isReadOnlyBashCommand("npm i")).toBe(false);
    expect(isReadOnlyBashCommand("bun add lodash")).toBe(false);
    expect(isReadOnlyBashCommand("pip install x")).toBe(false);
    expect(isReadOnlyBashCommand("dd if=a of=b")).toBe(false);
    expect(isReadOnlyBashCommand("truncate -s0 f")).toBe(false);
    expect(isReadOnlyBashCommand("cmd 2> err")).toBe(false);
    expect(isReadOnlyBashCommand("cmd >| f")).toBe(false);
  });

  test("UNDER-BLOCK guard: newly-denylisted write verbs classify as NOT read-only", () => {
    // sponge (moreutils) writes stdin back to a file.
    expect(isReadOnlyBashCommand("jq . f.json | sponge f.json")).toBe(false);
    // network downloaders that write to disk.
    expect(isReadOnlyBashCommand("curl -o out.json https://x")).toBe(false);
    expect(isReadOnlyBashCommand("curl -O https://x/file")).toBe(false);
    expect(isReadOnlyBashCommand("curl --output out https://x")).toBe(false);
    expect(isReadOnlyBashCommand("wget https://x/file")).toBe(false);
    // gh api mutating method + gh release/repo writes.
    expect(isReadOnlyBashCommand("gh api -X POST /repos/o/r/issues")).toBe(false);
    expect(isReadOnlyBashCommand("gh api repos/o/r --method DELETE -X DELETE")).toBe(false);
    expect(isReadOnlyBashCommand("gh release create v1.0.0")).toBe(false);
    expect(isReadOnlyBashCommand("gh release delete v1.0.0")).toBe(false);
    expect(isReadOnlyBashCommand("gh release upload v1 dist.zip")).toBe(false);
    expect(isReadOnlyBashCommand("gh repo create my/repo")).toBe(false);
    expect(isReadOnlyBashCommand("gh repo delete my/repo")).toBe(false);
    expect(isReadOnlyBashCommand("gh repo clone my/repo")).toBe(false);
    // extended git write subcommands.
    expect(isReadOnlyBashCommand("git worktree add ../wt main")).toBe(false);
    expect(isReadOnlyBashCommand("git config user.name x")).toBe(false);
    expect(isReadOnlyBashCommand("git update-ref refs/heads/x HEAD")).toBe(false);
    // archive extraction / creation.
    expect(isReadOnlyBashCommand("tar xzf bundle.tgz")).toBe(false);
    expect(isReadOnlyBashCommand("tar -xvf bundle.tar")).toBe(false);
    expect(isReadOnlyBashCommand("unzip bundle.zip")).toBe(false);
    // cluster / container mutation.
    expect(isReadOnlyBashCommand("kubectl apply -f manifest.yaml")).toBe(false);
    expect(isReadOnlyBashCommand("kubectl create ns x")).toBe(false);
    expect(isReadOnlyBashCommand("kubectl delete pod x")).toBe(false);
    expect(isReadOnlyBashCommand("kubectl patch deploy x -p {}")).toBe(false);
    expect(isReadOnlyBashCommand("kubectl replace -f x.yaml")).toBe(false);
    expect(isReadOnlyBashCommand("docker run img")).toBe(false);
    expect(isReadOnlyBashCommand("docker rm c")).toBe(false);
    expect(isReadOnlyBashCommand("docker rmi img")).toBe(false);
    expect(isReadOnlyBashCommand("docker build -t x .")).toBe(false);
    expect(isReadOnlyBashCommand("docker push img")).toBe(false);
    expect(isReadOnlyBashCommand("docker create img")).toBe(false);
  });

  test("UNDER-BLOCK guard: script-interpreter invocations of mutation-named scripts classify as NOT read-only", () => {
    // Path-anchored: interpreter starts the command, next arg is a script path whose
    // basename starts with a mutation verb (or mentions governed-change).
    expect(isReadOnlyBashCommand("bun run scripts/apply-governed-change.ts")).toBe(false);
    expect(isReadOnlyBashCommand("node scripts/migrate-palantir-math-schema.ts")).toBe(false);
    expect(isReadOnlyBashCommand("tsx scripts/sync-codex-adapter.ts")).toBe(false);
  });

  test("NON-OVER-BLOCK guard: script-interpreter invocations that are NOT mutation-named scripts stay read-only", () => {
    // `bun test`, `bun run typecheck`, and `verify-*`/`gen-*` scripts must not be
    // reclassified by the mutation-script-invocation rule above.
    expect(isReadOnlyBashCommand("bun test tests/lib/hooks/tool-classifier.test.ts")).toBe(true);
    expect(isReadOnlyBashCommand("bun run typecheck")).toBe(true);
    expect(isReadOnlyBashCommand("bun run scripts/verify-no-semantic-root-fork.ts")).toBe(true);
    // gen- scripts are intentionally left alone by this narrow rule (they write generated
    // files, but that classification is out of scope for this fix and unchanged).
    expect(isReadOnlyBashCommand("bun run scripts/gen-cartography.ts")).toBe(true);
    expect(isReadOnlyBashCommand("bun run gen:cartography")).toBe(true);
    expect(isReadOnlyBashCommand("bun run check:cartography")).toBe(true);
    // vocabulary appearing later in the line (not the leading script-path argument) must
    // not trigger the rule -- guards against reintroducing bd-003-style over-block.
    expect(isReadOnlyBashCommand("bun test tests/apply-something.test.ts")).toBe(true);
    expect(isReadOnlyBashCommand("grep bun run scripts/apply-foo.ts docs.md")).toBe(true);
  });

  test("NON-OVER-BLOCK guard: read-only interpreter one-liners + read network/container verbs stay read-only", () => {
    // CRITICAL (bd-003): no blanket `python -c` / `node -e` denylist — these run
    // read-only one-liners far more often than writes. Locks the guarantee.
    expect(isReadOnlyBashCommand("python -c 'print(1+1)'")).toBe(true);
    expect(isReadOnlyBashCommand('python3 -c "import sys; print(sys.version)"')).toBe(true);
    expect(isReadOnlyBashCommand("node -e 'console.log(process.version)'")).toBe(true);
    // bare curl (no output flag) reads; git read subcommands; read kubectl/docker.
    expect(isReadOnlyBashCommand("curl -s https://x")).toBe(true);
    expect(isReadOnlyBashCommand("git config --get user.name")).toBe(false); // config is a write-subcommand match (intentional)
    expect(isReadOnlyBashCommand("git worktree list")).toBe(false); // worktree is a write-subcommand match (intentional)
    expect(isReadOnlyBashCommand("kubectl get pods")).toBe(true);
    expect(isReadOnlyBashCommand("docker ps")).toBe(true);
    expect(isReadOnlyBashCommand("gh api /repos/o/r")).toBe(true); // GET (no -X mutating method)
    expect(isReadOnlyBashCommand("tar tzf bundle.tgz")).toBe(true); // list, not extract
  });

  test("read-only-classified Bash drops protected-mutation + regains bypass eligibility", () => {
    const ro = classifyHookTool({ tool_name: "Bash", tool_input: { command: "du -sh *" } });
    expect(ro.isReadOnly).toBe(true);
    expect(ro.isProtectedMutation).toBe(false);
    const mut = classifyHookTool({ tool_name: "Bash", tool_input: { command: "rm -rf f" } });
    expect(mut.isReadOnly).toBe(false);
    expect(mut.isProtectedMutation).toBe(true);
  });

  test("attaches capability metadata for every declared palantir-mini MCP tool", () => {
    for (const capability of MCP_TOOL_CAPABILITIES) {
      const classification = classifyHookTool({
        tool_name: `mcp__palantir_mini__${capability.toolName}`,
      });
      expect(classification.isPalantirMiniMcpTool).toBe(true);
      expect(classification.classificationSource).toBe("mcp-tool-capability");
      expect(classification.mcpToolCapability?.toolName).toBe(capability.toolName);
    }
  });

  test("keeps fallback-classified MCP tools on legacy unknown behavior", () => {
    const classification = classifyHookTool({
      tool_name: "mcp__palantir_mini__get_ontology",
    });

    expect(classification.operation).toBe("get_ontology");
    expect(classification.isReadOnly).toBe(true);
    expect(classification.isProtectedMutation).toBe(false);
    expect(classification.isDtcMutatingMcpTool).toBe(false);
    expect(classification.mcpToolCapability?.classifierProjection.classificationMode)
      .toBe("legacy-fallback");
  });

  test("centralizes MCP-first evidence tool namespace aliases", () => {
    for (const toolName of [
      "impact_query",
      "pre_edit_impact",
      "get_ontology",
      "mcp__plugin_palantir-mini_palantir-mini__impact_query",
      "mcp__palantir_mini__pre_edit_impact",
      "mcp__palantir_mini__.get_ontology",
      "mcp__palantir-mini__impact_query",
      "mcp_palantir-mini_pre_edit_impact",
      "mcp_palantir_mini_get_ontology",
    ]) {
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(true);
    }

    for (const toolName of [
      "pm_workflow_lineage_query",
      "propagation_audit_forward",
      "mcp__palantir_mini__pm_workflow_lineage_query",
      "mcp__palantir_mini__.propagation_audit_forward",
      "mcp__palantir_mini__commit_edits",
    ]) {
      expect(isMcpFirstEvidenceToolName(toolName)).toBe(false);
    }
  });

  test("recognizes only markdown report artifacts in assigned output lanes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-assigned-report-"));
    try {
      const promptDir = path.join(root, "_workspace", "run-1", "spawn-prompts");
      fs.mkdirSync(promptDir, { recursive: true });
      const agentReport = path.join(root, "_workspace", "run-1", "agent-outputs", "W1.md");
      const workerReport = path.join(root, "_workspace", "run-1", "worker-outputs", "R1-review.md");
      fs.writeFileSync(
        path.join(promptDir, "index.md"),
        [
          `Required output: ${agentReport}`,
          "Required output: worker-outputs/R1-review.md",
        ].join("\n"),
      );

      expect(isAssignedReviewArtifactPath(agentReport)).toBe(true);
      expect(isAssignedReviewArtifactPath(workerReport)).toBe(true);
      expect(isAssignedReviewArtifactPath(path.join(root, "_workspace", "run-1", "agent-outputs", "undeclared.md"))).toBe(false);
      expect(isAssignedReviewArtifactPath(path.join(root, "_workspace", "run-1", "agent-outputs", "report.txt"))).toBe(false);
      expect(isAssignedReviewArtifactPath(path.join(root, "_workspace", "run-1", "notes", "report.md"))).toBe(false);
      expect(isAssignedReviewArtifactPath(path.join(root, "_workspace", "run-1", "agent-outputs", "nested", "report.md"))).toBe(false);
      expect(isAssignedReviewArtifactPath("/home/test/.codex/plugins/cache/pkg/_workspace/run-1/agent-outputs/W1.md")).toBe(false);
      expect(isAssignedReviewArtifactPath(path.join(root, "plugins", "palantir-mini", "hooks", "report.md"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
