import type { EffectDef } from '../effects';
import type {
	ResourceV2RuntimeCatalog,
	ResourceV2RuntimeDefinition,
} from '../resourcesV2';

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

export type ResourceV2Id = string;

export interface ResourceV2BoundTracker {
	lower?: number;
	upper?: number;
}

export interface ResourceV2RecentGain {
	key: ResourceV2Id;
	amount: number;
}

export type ResourceV2ValueMap = Record<ResourceV2Id, number>;
export type ResourceV2BoundMap = Record<ResourceV2Id, ResourceV2BoundTracker>;
export type ResourceV2TouchedMap = Record<ResourceV2Id, boolean>;

export interface ResourceV2State {
	values: ResourceV2ValueMap;
	bounds: ResourceV2BoundMap;
	touched: ResourceV2TouchedMap;
	recentGains: ResourceV2RecentGain[];
}

const ResourceV2Definitions: Record<ResourceV2Id, ResourceV2RuntimeDefinition> =
	{};
let orderedResourceV2Ids: ResourceV2Id[] = [];

export function setResourceV2Keys(catalog: ResourceV2RuntimeCatalog) {
	orderedResourceV2Ids = [...catalog.orderedResourceIds];
	for (const key of Object.keys(ResourceV2Definitions)) {
		delete ResourceV2Definitions[key];
	}
	for (const id of orderedResourceV2Ids) {
		const definition = catalog.resourcesById[id];
		if (!definition) {
			continue;
		}
		ResourceV2Definitions[id] = definition;
	}
}

export function getResourceV2Ids(): ResourceV2Id[] {
	return orderedResourceV2Ids;
}

export function getResourceV2Definition(
	id: ResourceV2Id,
): ResourceV2RuntimeDefinition | undefined {
	return ResourceV2Definitions[id];
}

export function getResourceV2ValueMap(state: PlayerState): ResourceV2ValueMap {
	return state.resourceV2.values;
}

export function getResourceV2Bounds(state: PlayerState): ResourceV2BoundMap {
	return state.resourceV2.bounds;
}

export function getResourceV2TouchedMap(
	state: PlayerState,
): ResourceV2TouchedMap {
	return state.resourceV2.touched;
}

export function getResourceV2RecentGains(
	state: PlayerState,
): ResourceV2RecentGain[] {
	return state.resourceV2.recentGains;
}

export function setResourceV2Value(
	state: PlayerState,
	id: ResourceV2Id,
	value: number,
) {
	state.resourceV2.values[id] = value;
	if (value !== 0) {
		state.resourceV2.touched[id] = true;
	}
}

export function setResourceV2Bounds(
	state: PlayerState,
	id: ResourceV2Id,
	lower: number | undefined,
	upper: number | undefined,
) {
	const tracker: ResourceV2BoundTracker = {};
	if (lower !== undefined) {
		tracker.lower = lower;
	}
	if (upper !== undefined) {
		tracker.upper = upper;
	}
	state.resourceV2.bounds[id] = tracker;
}

function initializeResourceV2State(state: PlayerState) {
	for (const id of orderedResourceV2Ids) {
		state.resourceV2.values[id] = 0;
		state.resourceV2.touched[id] = false;
		const definition = ResourceV2Definitions[id];
		const tracker: ResourceV2BoundTracker = {};
		if (definition?.lowerBound !== undefined) {
			tracker.lower = definition.lowerBound;
		}
		if (definition?.upperBound !== undefined) {
			tracker.upper = definition.upperBound;
		}
		state.resourceV2.bounds[id] = tracker;
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
	resourceV2: ResourceV2State;
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
		this.resourceV2 = {
			values: {},
			bounds: {},
			touched: {},
			recentGains: [],
		};
		initializeResourceV2State(this);
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
