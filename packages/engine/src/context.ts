import type { GameState, ResourceKey, PlayerId } from './state';
import type { AISystem } from './ai';
import type { Services, PassiveManager } from './services';
import type { StatSourceFrame } from './stat_sources';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	PlayerStartConfig,
	Registry,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from './phases';
import type { ActionTrace } from './log';
import type { RuntimeResourceCatalog } from './resource-v2';

export class EngineContext {
	constructor(
		public game: GameState,
		public services: Services,
		public actions: Registry<ActionDef>,
		public buildings: Registry<BuildingDef>,
		public developments: Registry<DevelopmentDef>,
		public populations: Registry<PopulationDef>,
		public passives: PassiveManager,
		public phases: PhaseDef[],
		public actionCostResource: ResourceKey,
		public actionCostAmount: number | null,
		public resourceCatalogV2: RuntimeResourceCatalog,
		public compensations: Record<PlayerId, PlayerStartConfig> = {
			A: {},
			B: {},
		},
	) {}
	aiSystem?: AISystem;
	recentResourceGains: {
		key: string;
		amount: number;
	}[] = [];
	// Cache base values for stat:add_pct per turn/phase/step to ensure
	// additive scaling when effects are evaluated multiple times in the
	// same step (e.g. multiple leaders raising strength).
	statAddPctBases: Record<string, number> = {};
	statAddPctAccums: Record<string, number> = {};
	actionTraces: ActionTrace[] = [];
	statSourceStack: StatSourceFrame[] = [];

	private _effectLogs: Map<string, unknown[]> = new Map();

	private _queue: Promise<unknown> = Promise.resolve();
	enqueue<T>(taskFactory: () => Promise<T> | T): Promise<T> {
		const nextTask = this._queue.then(() => taskFactory());
		this._queue = nextTask.catch(() => {});
		return nextTask;
	}
	pushEffectLog(key: string, data: unknown): void {
		const existingEntries = this._effectLogs.get(key);
		if (existingEntries) {
			existingEntries.push(data);
		} else {
			this._effectLogs.set(key, [data]);
		}
	}
	pullEffectLog<T>(key: string): T | undefined {
		const existingEntries = this._effectLogs.get(key);
		if (!existingEntries || existingEntries.length === 0) {
			return undefined;
		}
		const [nextEntry, ...remainingEntries] = existingEntries as T[];
		if (remainingEntries.length) {
			this._effectLogs.set(key, remainingEntries);
		} else {
			this._effectLogs.delete(key);
		}
		return nextEntry;
	}
	drainEffectLogs(): Map<string, unknown[]> {
		const entries: Array<[string, unknown[]]> = [];
		for (const [key, logs] of this._effectLogs.entries()) {
			const cloned = logs.map((entry) => {
				if (typeof entry !== 'object' || entry === null) {
					return entry;
				}
				return structuredClone(entry);
			});
			entries.push([key, cloned]);
		}
		this._effectLogs.clear();
		return new Map(entries);
	}
	get activePlayer() {
		return this.game.active;
	}
	get opponent() {
		return this.game.opponent;
	}
}
