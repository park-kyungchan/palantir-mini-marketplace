// Single-host (Claude) slim of gstack resolver types.
// Per rule 04 runtime boundary: non-Codex; no multi-host adapter.

export type Host = "claude";

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  preambleTier?: number;
}

export type ResolverFn = (ctx: TemplateContext, args?: string[]) => string;
