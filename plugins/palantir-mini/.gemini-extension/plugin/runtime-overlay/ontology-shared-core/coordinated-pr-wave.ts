/**
 * @stable — CoordinatedPRWave primitive (home-orchestrate-01, v1.0)
 *
 * Wave metadata for the /orchestrate DAG. Tracks which PRs belong to each
 * wave, the wave's dependency ordering, and merge status. Consumed by the
 * /orchestrate and /ship skills to enforce the W1-W6 pipeline and detect
 * when the atomic merge window (W5) is ready.
 *
 * Authority chain:
 *   ~/.claude/plans/bubbly-tumbling-cocoa.md → ~/ontology/shared-core/coordinated-pr-wave.ts (this file)
 *   → /orchestrate skill → wave gate enforcement
 *
 * D/L/A domain: ACTION (wave metadata tracks state of PR merges; it is a
 * stored fact about action-flow progress, owned by the action/orchestration layer)
 */

export type WaveId = string & { readonly __brand: "WaveId" };

export const waveId = (s: string): WaveId => s as WaveId;

export type WaveNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type WaveStatus = "pending" | "in-flight" | "merged" | "rolled-back";

export interface CoordinatedPRWaveDeclaration {
  readonly waveId: WaveId;
  readonly waveNumber: WaveNumber;
  readonly name: string;
  /** WaveIds that must reach 'merged' status before this wave can start */
  readonly dependencies: ReadonlyArray<WaveId>;
  /** GitHub PR numbers belonging to this wave */
  readonly prNumbers: ReadonlyArray<number>;
  readonly status: WaveStatus;
}

export class CoordinatedPRWaveRegistry {
  private readonly items = new Map<WaveId, CoordinatedPRWaveDeclaration>();

  register(decl: CoordinatedPRWaveDeclaration): void {
    this.items.set(decl.waveId, decl);
  }

  get(id: WaveId): CoordinatedPRWaveDeclaration | undefined {
    return this.items.get(id);
  }

  keys(): IterableIterator<WaveId> {
    return this.items.keys();
  }

  list(): CoordinatedPRWaveDeclaration[] {
    return [...this.items.values()];
  }
}

export const COORDINATED_PR_WAVE_REGISTRY = new CoordinatedPRWaveRegistry();
