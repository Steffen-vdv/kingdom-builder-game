import type { EffectDef } from '../effects';
import {
	createResourceV2State,
	getResourceValue,
	setResourceValue,
	type ResourceV2State,
	type ResourceV2StateBlueprint,
} from '../resourceV2';

export const Resource: Record<string, string> = {};
export type ResourceKey = string;
export function setResourceKeys(keys: string[]) {
	for (const key of Object.keys(Resource)) {
		delete Resource[key];
	}
	for (const key of keys) {
		Resource[key] = key;
	}
}

export const Stat: Record<string, string> = {};
export type StatKey = string;
export function setStatKeys(keys: string[]) {
	for (const key of Object.keys(Stat)) {
		delete Stat[key];
	}
	for (const key of keys) {
		Stat[key] = key;
	}
}

export const Phase: Record<string, string> = {};
export type PhaseId = string;
export function setPhaseKeys(keys: string[]) {
	for (const key of Object.keys(Phase)) {
		delete Phase[key];
	}
	for (const id of keys) {
		Phase[id.charAt(0).toUpperCase() + id.slice(1)] = id;
	}
}

export const PopulationRole: Record<string, string> = {};
export type PopulationRoleId = string;
export function setPopulationRoleKeys(keys: string[]) {
	for (const key of Object.keys(PopulationRole)) {
		delete PopulationRole[key];
	}
	for (const id of keys) {
		PopulationRole[id.charAt(0).toUpperCase() + id.slice(1)] = id;
	}
}

export interface StatSourceLink {
	type?: string;
	id?: string;
	detail?: string;
	extra?: Record<string, unknown>;
}

export interface StatSourceMeta {
	key: string;
	longevity: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: StatSourceLink[];
	removal?: StatSourceLink;
	effect?: {
		type?: string;
		method?: string;
	};
	extra?: Record<string, unknown>;
}

export interface StatSourceContribution {
	amount: number;
	meta: StatSourceMeta;
}

export interface PlayerStateResourceV2LegacyKeys {
	resources?: readonly ResourceKey[];
	stats?: readonly StatKey[];
	population?: readonly PopulationRoleId[];
}

export interface PlayerStateResourceV2Options {
	blueprint: ResourceV2StateBlueprint;
	initialValues?: Record<string, number>;
	legacy?: PlayerStateResourceV2LegacyKeys;
}

export interface PlayerStateOptions {
	resourceV2?: PlayerStateResourceV2Options;
}

export type PlayerId = 'A' | 'B';

export interface GameConclusion {
	conditionId: string;
	winnerId: PlayerId;
	loserId: PlayerId;
	triggeredBy: PlayerId;
}

export class Land {
	id: string;
	slotsMax: number;
	slotsUsed = 0;
	developments: string[] = [];
	tilled = false;
	upkeep?: Record<ResourceKey, number>;
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
	constructor(id: string, slotsMax: number, tilled = false) {
		this.id = id;
		this.slotsMax = slotsMax;
		this.tilled = tilled;
	}
	get slotsFree() {
		return this.slotsMax - this.slotsUsed;
	}
}

export class PlayerState {
	id: PlayerId;
	name: string;
	resources: Record<ResourceKey, number>;
	stats: Record<StatKey, number>;
	/**
	 * Tracks whether a stat has ever been non-zero. This allows the UI to hide
	 * stats that are zero and have never changed while still showing stats that
	 * returned to zero after previously having a value.
	 */
	statsHistory: Record<StatKey, boolean>;
	population: Record<PopulationRoleId, number>;
	lands: Land[] = [];
	buildings: Set<string> = new Set();
	actions: Set<string> = new Set();
	statSources: Record<StatKey, Record<string, StatSourceContribution>>;
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	resourceV2?: ResourceV2State;
	private readonly resourceLegacyKeys: ReadonlySet<ResourceKey>;
	private readonly statLegacyKeys: ReadonlySet<StatKey>;
	private readonly populationLegacyKeys: ReadonlySet<PopulationRoleId>;
	private readonly resourceFallback: Record<string, number> = {};
	private readonly statFallback: Record<string, number> = {};
	private readonly populationFallback: Record<string, number> = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
	constructor(id: PlayerId, name: string, options: PlayerStateOptions = {}) {
		this.id = id;
		this.name = name;
		const resourceKeys: ResourceKey[] = Object.values(Resource);
		const statKeys: StatKey[] = Object.values(Stat);
		const populationKeys: PopulationRoleId[] = Object.values(PopulationRole);
		const legacyConfig = options.resourceV2?.legacy ?? {};
		this.resourceLegacyKeys = new Set(legacyConfig.resources ?? resourceKeys);
		this.statLegacyKeys = new Set(legacyConfig.stats ?? statKeys);
		this.populationLegacyKeys = new Set(
			legacyConfig.population ?? populationKeys,
		);
		if (options.resourceV2?.blueprint) {
			this.resourceV2 = createResourceV2State(options.resourceV2.blueprint, {
				values: options.resourceV2.initialValues,
			});
		}
		this.resources = this.createLegacyShim(
			Array.from(this.resourceLegacyKeys),
			this.resourceFallback,
			'resource',
		);
		for (const key of resourceKeys) {
			Object.defineProperty(this, key, {
				get: () => this.resources[key],
				set: (value: number) => {
					this.resources[key] = value;
				},
				enumerable: false,
				configurable: true,
			});
		}
		this.stats = this.createLegacyShim(
			Array.from(this.statLegacyKeys),
			this.statFallback,
			'stat',
			(key, value) => {
				if (value !== 0) {
					this.statsHistory[key] = true;
				}
			},
		);
		this.statsHistory = {};
		this.statSources = {} as Record<
			StatKey,
			Record<string, StatSourceContribution>
		>;
		for (const key of statKeys) {
			this.statsHistory[key] = false;
			this.statSources[key] = {};
			Object.defineProperty(this, key, {
				get: () => this.stats[key],
				set: (value: number) => {
					this.stats[key] = value;
					if (value !== 0) {
						this.statsHistory[key] = true;
					}
				},
				enumerable: false,
				configurable: true,
			});
		}
		this.population = this.createLegacyShim(
			Array.from(this.populationLegacyKeys),
			this.populationFallback,
			'population',
		);
		this.lands = [];
		this.buildings = new Set();
		this.actions = new Set();
		this.skipPhases = {};
		this.skipSteps = {};
		if (this.resourceV2) {
			this.initialiseLegacyStatsHistory();
		}
	}

	private initialiseLegacyStatsHistory() {
		if (!this.resourceV2) {
			return;
		}
		for (const key of this.statLegacyKeys) {
			const value = getResourceValue(this.resourceV2, key);
			if (value !== 0) {
				this.statsHistory[key] = true;
			}
		}
	}

	private createLegacyShim<KeyType extends string>(
		keys: readonly KeyType[],
		fallback: Record<string, number>,
		category: 'resource' | 'stat' | 'population',
		onWrite?: (key: KeyType, value: number) => void,
	): Record<KeyType, number> {
		const shim: Record<KeyType, number> = {};
		for (const key of keys) {
			if (!(key in fallback)) {
				fallback[key] = 0;
			}
			Object.defineProperty(shim, key, {
				get: () => this.readLegacyValue(key, fallback),
				set: (value: number) => {
					const next = this.writeLegacyValue(key, value, fallback, category);
					if (onWrite) {
						onWrite(key, next);
					}
				},
				enumerable: true,
				configurable: true,
			});
		}
		return shim;
	}

	private readLegacyValue(
		key: string,
		fallback: Record<string, number>,
	): number {
		if (!this.resourceV2) {
			return fallback[key] ?? 0;
		}
		const definition = this.resourceV2.blueprint.values.get(key);
		if (!definition) {
			return fallback[key] ?? 0;
		}
		return getResourceValue(this.resourceV2, key);
	}

	private writeLegacyValue(
		key: string,
		value: number,
		fallback: Record<string, number>,
		category: 'resource' | 'stat' | 'population',
	): number {
		if (!this.resourceV2) {
			fallback[key] = value;
			return value;
		}
		const definition = this.resourceV2.blueprint.values.get(key);
		if (!definition) {
			fallback[key] = value;
			return value;
		}
		if (definition.kind !== 'resource') {
			throw new Error(
				`Cannot directly assign legacy ${category} value for limited ResourceV2 parent: ${key}`,
			);
		}
		const next = setResourceValue(this.resourceV2, key, value);
		fallback[key] = next;
		return next;
	}

	handleResourceV2ValueChange(resourceId: string): void {
		if (!this.resourceV2) {
			return;
		}
		const statKey: StatKey = resourceId;
		if (this.statLegacyKeys.has(statKey)) {
			const value = getResourceValue(this.resourceV2, statKey);
			if (value !== 0) {
				this.statsHistory[statKey] = true;
			}
		}
	}
}

export class GameState {
	turn = 1;
	currentPlayerIndex = 0; // multi-player friendly
	currentPhase = '';
	currentStep = '';
	phaseIndex = 0;
	stepIndex = 0;
	devMode = false;
	conclusion?: GameConclusion;
	players: PlayerState[];
	constructor(
		aName = 'Player',
		bName = 'Opponent',
		playerFactory: (id: PlayerId, name: string) => PlayerState = (id, name) =>
			new PlayerState(id, name),
	) {
		this.players = [playerFactory('A', aName), playerFactory('B', bName)];
	}
	get active(): PlayerState {
		return this.players[this.currentPlayerIndex]!;
	}
	get opponent(): PlayerState {
		return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
	}
}
