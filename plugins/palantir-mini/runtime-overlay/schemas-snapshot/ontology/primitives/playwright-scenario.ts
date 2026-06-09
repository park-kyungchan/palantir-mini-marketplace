/**
 * @stable — PlaywrightScenario primitive (prim-learn-04, v1.14.0)
 *
 * Browser-automation scenario that the harness Evaluator executes against
 * a running application. Sibling of ScenarioSandbox (prim-learn-02) but
 * targets live-app interaction rather than data what-if sandboxes.
 *
 * Evidence-based evaluation: Prithvi's core insight that "the Evaluator
 * navigates the page on its own, screenshotting and carefully studying the
 * implementation before producing its assessment" — prevents scoring
 * static screenshots or claims without proof.
 *
 * Authority:
 *   - Prithvi Rajasekaran's harness (Playwright-based live QA)
 *   - Claude Code Playwright MCP (~20 tools: browser_click, browser_navigate,
 *     browser_fill_form, browser_snapshot, browser_take_screenshot, etc.)
 *   - Claude Code claude-in-chrome MCP (alt. browser automation surface)
 *   - Palantir AIP Evals evidence capture: research/palantir-foundry/aip/
 *     aip-evals-results-dataset.md
 *
 * D/L/A domain: LEARN (live-evaluation scenario — produces evidence for
 * BackwardProp; not a stored fact, not a mutation; triggers grading but
 * does not itself commit)
 * @owner palantirkc-ontology
 * @purpose Live-app browser automation scenario (Evaluator substrate)
 */

export type PlaywrightScenarioRid = string & {
  readonly __brand: "PlaywrightScenarioRid";
};

export const playwrightScenarioRid = (s: string): PlaywrightScenarioRid =>
  s as PlaywrightScenarioRid;

/**
 * One atomic browser action executed in order at scenario runtime.
 * Mirrors Claude Code Playwright MCP primitive set; claude-in-chrome MCP
 * supports a compatible subset.
 */
export type PlaywrightStepKind =
  | "navigate"
  | "click"
  | "fill"
  | "press-key"
  | "hover"
  | "select-option"
  | "wait-for-selector"
  | "wait-for-network-idle"
  | "wait-for-timeout"
  | "screenshot"
  | "snapshot"
  | "evaluate-js"
  | "assert-text"
  | "assert-visible"
  | "assert-count"
  | "assert-url"
  | "assert-api-status"
  | "assert-console-no-errors";

export interface PlaywrightStep {
  readonly kind: PlaywrightStepKind;
  /**
   * CSS or role-based selector for click/fill/hover/wait-for-selector/
   * assert-visible/assert-count. Prefer role-based over CSS for stability.
   */
  readonly selector?: string;
  /**
   * Value for fill, URL for navigate, JS source for evaluate-js, key for
   * press-key, option value for select-option, timeout ms for
   * wait-for-timeout.
   */
  readonly value?: string;
  /** Assertion target for assert-* kinds */
  readonly expected?: string | number;
  /** Override default 30,000 ms timeout per step */
  readonly timeoutMs?: number;
  /** Human-readable label shown in Evaluator reports */
  readonly label?: string;
}

export interface EvidenceCaptureSpec {
  readonly screenshots: boolean;
  readonly networkLog: boolean;
  readonly consoleLog: boolean;
  /** Full session video — larger artifact, use sparingly */
  readonly video: boolean;
  /** Full-page accessibility tree dump (for a11y criteria) */
  readonly accessibilityTree: boolean;
  /**
   * DOM snapshot at scenario end. Prefer over raw HTML for semantic
   * comparison against expected structure.
   */
  readonly domSnapshot: boolean;
}

/**
 * MCP tool binding — which browser MCP server executes the scenario.
 * palantir-mini v2.0 supports both; user can pick per scenario based on
 * availability and feature set.
 */
export type PlaywrightMcpBinding =
  | "mcp__playwright__*"
  | "mcp__claude-in-chrome__*";

export interface PlaywrightScenarioDeclaration {
  readonly scenarioId: PlaywrightScenarioRid;
  /** Starting URL for the scenario */
  readonly url: string;
  readonly steps: readonly PlaywrightStep[];
  readonly evidenceCaptureSpec: EvidenceCaptureSpec;
  /**
   * Assertion RIDs (as strings) this scenario produces evidence for.
   * Evaluator resolves these against the captured evidence to score
   * GradingCriterion instances.
   */
  readonly assertionBundleRids: readonly string[];
  /** Preconditions to verify before step execution (e.g. "dev server up") */
  readonly preconditions: readonly string[];
  /** Postconditions to verify at scenario end (e.g. "DB has expected row") */
  readonly postconditions: readonly string[];
  /** Which browser MCP handles execution */
  readonly mcpToolBinding: PlaywrightMcpBinding;
  /** Optional viewport override (e.g. responsive testing at 375/768/1440) */
  readonly viewport?: {
    readonly width: number;
    readonly height: number;
  };
  /** Optional auth state — path to stored storageState JSON */
  readonly storageStatePath?: string;
  readonly description?: string;
}

/**
 * @deprecated Since schemas v1.16.0 (palantir-mini v2.1.0). No consumers —
 * 0 imports across 3 projects in 30d; all 5 authored scenarios bypass the
 * registry and use plain `@playwright/test`. The `PlaywrightScenario` type
 * and `playwright_scenario_executed` event remain fully supported; only
 * this in-memory singleton is scheduled for removal in v2.0.0 of the
 * schemas package. See ~/.claude/schemas/CHANGELOG.md v1.16.0.
 */
export class PlaywrightScenarioRegistry {
  private readonly items = new Map<
    PlaywrightScenarioRid,
    PlaywrightScenarioDeclaration
  >();

  register(decl: PlaywrightScenarioDeclaration): void {
    this.items.set(decl.scenarioId, decl);
  }

  get(rid: PlaywrightScenarioRid): PlaywrightScenarioDeclaration | undefined {
    return this.items.get(rid);
  }

  byMcpBinding(binding: PlaywrightMcpBinding): PlaywrightScenarioDeclaration[] {
    return [...this.items.values()].filter((s) => s.mcpToolBinding === binding);
  }

  keys(): IterableIterator<PlaywrightScenarioRid> {
    return this.items.keys();
  }

  list(): PlaywrightScenarioDeclaration[] {
    return [...this.items.values()];
  }
}

/**
 * @deprecated Since schemas v1.16.0 — see `PlaywrightScenarioRegistry` docstring.
 */
export const PLAYWRIGHT_SCENARIO_REGISTRY = new PlaywrightScenarioRegistry();
