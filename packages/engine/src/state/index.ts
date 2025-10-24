import type { EffectDef } from '../effects';
import type { ResourceV2EngineRegistry } from '../resourceV2/registry';
import type { PlayerResourceV2State } from './resource_v2';
import {
	createEmptyPlayerResourceV2State,
	createPlayerResourceV2State,
} from './resource_v2';

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

export const ResourceV2Parent: Record<string, string> = {};
export type ResourceV2ParentId = string;
export function setResourceV2ParentKeys(keys: string[]) {
	for (const key of Object.keys(ResourceV2Parent)) {
		delete ResourceV2Parent[key];
	}
	for (const id of keys) {
		ResourceV2Parent[id.charAt(0).toUpperCase() + id.slice(1)] = id;
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
	resourceV2: PlayerResourceV2State;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
	constructor(id: PlayerId, name: string) {
		this.id = id;
		this.name = name;
		this.resources = {};
		for (const key of Object.values(Resource)) {
			this.resources[key] = 0;
			Object.defineProperty(this, key, {
				get: () => this.resources[key],
				set: (value: number) => {
					this.resources[key] = value;
				},
				enumerable: false,
				configurable: true,
			});
		}
		this.stats = {};
		this.statsHistory = {};
		this.statSources = {} as Record<
			StatKey,
			Record<string, StatSourceContribution>
		>;
		for (const key of Object.values(Stat)) {
			this.stats[key] = 0;
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
		this.population = {};
		for (const key of Object.values(PopulationRole)) {
			this.population[key] = 0;
		}
		this.skipPhases = {};
		this.skipSteps = {};
		this.resourceV2 = createEmptyPlayerResourceV2State();
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
	constructor(aName = 'Player', bName = 'Opponent') {
		this.players = [new PlayerState('A', aName), new PlayerState('B', bName)];
	}
	get active(): PlayerState {
		return this.players[this.currentPlayerIndex]!;
	}
	get opponent(): PlayerState {
		return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
	}
}

export function initializePlayerResourceV2State(
	player: PlayerState,
	registry: ResourceV2EngineRegistry,
): PlayerResourceV2State {
	const state = createPlayerResourceV2State(registry);
	player.resourceV2 = state;
	linkResourceV2Accessors(player, registry, state);
	return state;
}

function linkResourceV2Accessors(
	player: PlayerState,
	registry: ResourceV2EngineRegistry,
	state: PlayerResourceV2State,
) {
	for (const resourceId of registry.resourceIds) {
		Object.defineProperty(player, resourceId, {
			get: () => state.amounts[resourceId] ?? 0,
			set: (value: number) => {
				state.amounts[resourceId] = value;
				state.touched[resourceId] = true;
			},
			enumerable: false,
			configurable: true,
		});
	}
	for (const parentId of registry.parentIds) {
		Object.defineProperty(player, parentId, {
			get: () => state.amounts[parentId] ?? 0,
			set: () => {
				throw new Error(
					`ResourceV2 parent "${parentId}" amount is derived from child resources.`,
				);
			},
			enumerable: false,
			configurable: true,
		});
	}
}

export {
	createPlayerResourceV2State,
	resetRecentResourceV2Gains,
	applyResourceV2ValueChange,
} from './resource_v2';
export type {
	PlayerResourceV2State,
	PlayerResourceV2TierState,
	ResourceV2HookSuppressionMeta,
	ResourceV2ValueChangeRequest,
} from './resource_v2';
