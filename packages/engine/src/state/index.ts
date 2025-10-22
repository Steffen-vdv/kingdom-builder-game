import type { EffectDef } from '../effects';
import type {
	ResourceV2RuntimeCatalog,
	ResourceV2RuntimeDefinition,
	ResourceV2RuntimeGroupParent,
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

export const ResourceV2: Record<string, string> = {};
export const ResourceV2Parent: Record<string, string> = {};
export type ResourceV2Key = string;
export type ResourceV2ParentKey = string;

let resourceV2Definitions: Record<ResourceV2Key, ResourceV2RuntimeDefinition> =
	{};
let resourceV2ParentDefinitions: Record<
	ResourceV2ParentKey,
	ResourceV2RuntimeGroupParent
> = {};
let resourceV2ParentIdByChild: Record<ResourceV2Key, ResourceV2ParentKey> = {};
let resourceV2OrderedKeys: ResourceV2Key[] = [];
let resourceV2OrderedParentKeys: ResourceV2ParentKey[] = [];

export function setResourceV2Keys(catalog?: ResourceV2RuntimeCatalog): void {
	for (const key of Object.keys(ResourceV2)) {
		delete ResourceV2[key];
	}
	for (const key of Object.keys(ResourceV2Parent)) {
		delete ResourceV2Parent[key];
	}
	resourceV2Definitions = {};
	resourceV2ParentDefinitions = {};
	resourceV2ParentIdByChild = {};
	resourceV2OrderedKeys = [];
	resourceV2OrderedParentKeys = [];

	if (!catalog) {
		return;
	}

	resourceV2OrderedKeys = [...catalog.orderedResourceIds];
	for (const id of resourceV2OrderedKeys) {
		ResourceV2[id] = id;
		const definition = catalog.resourcesById[id];
		if (definition) {
			resourceV2Definitions[id] = definition;
		}
		const parentId = catalog.parentIdByResourceId[id];
		if (parentId) {
			resourceV2ParentIdByChild[id] = parentId;
		}
	}

	const parentsInOrder = Object.values(catalog.parentsById).sort(
		(a, b) => a.order - b.order,
	);
	resourceV2OrderedParentKeys = parentsInOrder.map((parent) => parent.id);
	for (const parent of parentsInOrder) {
		ResourceV2Parent[parent.id] = parent.id;
		resourceV2ParentDefinitions[parent.id] = parent;
	}
}

export function getResourceV2Keys(): ResourceV2Key[] {
	return [...resourceV2OrderedKeys];
}

export function getResourceV2ParentKeys(): ResourceV2ParentKey[] {
	return [...resourceV2OrderedParentKeys];
}

export function getResourceV2Definition(
	key: ResourceV2Key,
): ResourceV2RuntimeDefinition | undefined {
	return resourceV2Definitions[key];
}

export function getResourceV2ParentDefinition(
	key: ResourceV2ParentKey,
): ResourceV2RuntimeGroupParent | undefined {
	return resourceV2ParentDefinitions[key];
}

export function getResourceV2ParentId(
	key: ResourceV2Key,
): ResourceV2ParentKey | undefined {
	return resourceV2ParentIdByChild[key];
}

export interface ResourceV2RecentGain {
	key: ResourceV2Key;
	amount: number;
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
	resourceV2: Record<ResourceV2Key, number>;
	resourceV2Values: Record<ResourceV2Key, number>;
	resourceV2LowerBounds: Record<ResourceV2Key, number | undefined>;
	resourceV2UpperBounds: Record<ResourceV2Key, number | undefined>;
	resourceV2Touched: Record<ResourceV2Key, boolean>;
	resourceV2BoundTouched: Record<ResourceV2Key, boolean>;
	resourceV2RecentGains: ResourceV2RecentGain[];
	resourceV2Parents: Record<ResourceV2ParentKey, number>;
	resourceV2ParentValues: Record<ResourceV2ParentKey, number>;
	resourceV2ParentLowerBounds: Record<ResourceV2ParentKey, number | undefined>;
	resourceV2ParentUpperBounds: Record<ResourceV2ParentKey, number | undefined>;
	resourceV2ParentTouched: Record<ResourceV2ParentKey, boolean>;
	resourceV2ParentBoundTouched: Record<ResourceV2ParentKey, boolean>;
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
		this.resourceV2 = {} as Record<ResourceV2Key, number>;
		this.resourceV2Values = {} as Record<ResourceV2Key, number>;
		this.resourceV2LowerBounds = {} as Record<
			ResourceV2Key,
			number | undefined
		>;
		this.resourceV2UpperBounds = {} as Record<
			ResourceV2Key,
			number | undefined
		>;
		this.resourceV2Touched = {} as Record<ResourceV2Key, boolean>;
		this.resourceV2BoundTouched = {} as Record<ResourceV2Key, boolean>;
		this.resourceV2RecentGains = [];
		this.resourceV2Parents = {} as Record<ResourceV2ParentKey, number>;
		this.resourceV2ParentValues = {} as Record<ResourceV2ParentKey, number>;
		this.resourceV2ParentLowerBounds = {} as Record<
			ResourceV2ParentKey,
			number | undefined
		>;
		this.resourceV2ParentUpperBounds = {} as Record<
			ResourceV2ParentKey,
			number | undefined
		>;
		this.resourceV2ParentTouched = {} as Record<ResourceV2ParentKey, boolean>;
		this.resourceV2ParentBoundTouched = {} as Record<
			ResourceV2ParentKey,
			boolean
		>;
		for (const key of resourceV2OrderedKeys) {
			this.resourceV2Values[key] = 0;
			const definition = resourceV2Definitions[key];
			this.resourceV2LowerBounds[key] = definition?.lowerBound;
			this.resourceV2UpperBounds[key] = definition?.upperBound;
			this.resourceV2Touched[key] = false;
			this.resourceV2BoundTouched[key] = false;
			Object.defineProperty(this.resourceV2, key, {
				get: () => this.resourceV2Values[key],
				set: (value: number) => {
					this.resourceV2Values[key] = value;
				},
				enumerable: true,
				configurable: true,
			});
		}
		for (const parentId of resourceV2OrderedParentKeys) {
			this.resourceV2ParentValues[parentId] = 0;
			const parentDefinition = resourceV2ParentDefinitions[parentId];
			this.resourceV2ParentLowerBounds[parentId] = parentDefinition?.lowerBound;
			this.resourceV2ParentUpperBounds[parentId] = parentDefinition?.upperBound;
			this.resourceV2ParentTouched[parentId] = false;
			this.resourceV2ParentBoundTouched[parentId] = false;
			Object.defineProperty(this.resourceV2Parents, parentId, {
				get: () => this.resourceV2ParentValues[parentId],
				set: (value: number) => {
					this.resourceV2ParentValues[parentId] = value;
				},
				enumerable: true,
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

export function getResourceV2Value(
	player: PlayerState,
	key: ResourceV2Key,
): number {
	return player.resourceV2Values[key] ?? 0;
}

export function setResourceV2Value(
	player: PlayerState,
	key: ResourceV2Key,
	value: number,
): void {
	player.resourceV2Values[key] = value;
}

export function getResourceV2LowerBound(
	player: PlayerState,
	key: ResourceV2Key,
): number | undefined {
	return player.resourceV2LowerBounds[key];
}

export function setResourceV2LowerBound(
	player: PlayerState,
	key: ResourceV2Key,
	value: number | undefined,
): void {
	player.resourceV2LowerBounds[key] = value;
}

export function getResourceV2UpperBound(
	player: PlayerState,
	key: ResourceV2Key,
): number | undefined {
	return player.resourceV2UpperBounds[key];
}

export function setResourceV2UpperBound(
	player: PlayerState,
	key: ResourceV2Key,
	value: number | undefined,
): void {
	player.resourceV2UpperBounds[key] = value;
}

export function markResourceV2Touched(
	player: PlayerState,
	key: ResourceV2Key,
): void {
	player.resourceV2Touched[key] = true;
}

export function markResourceV2BoundTouched(
	player: PlayerState,
	key: ResourceV2Key,
): void {
	player.resourceV2BoundTouched[key] = true;
}

export function logResourceV2RecentGain(
	player: PlayerState,
	gain: ResourceV2RecentGain,
): void {
	player.resourceV2RecentGains.push({ key: gain.key, amount: gain.amount });
}

export function clearResourceV2RecentGains(player: PlayerState): void {
	player.resourceV2RecentGains = [];
}

export function getResourceV2ParentValue(
	player: PlayerState,
	key: ResourceV2ParentKey,
): number {
	return player.resourceV2ParentValues[key] ?? 0;
}

export function setResourceV2ParentValue(
	player: PlayerState,
	key: ResourceV2ParentKey,
	value: number,
): void {
	player.resourceV2ParentValues[key] = value;
}

export function getResourceV2ParentLowerBound(
	player: PlayerState,
	key: ResourceV2ParentKey,
): number | undefined {
	return player.resourceV2ParentLowerBounds[key];
}

export function setResourceV2ParentLowerBound(
	player: PlayerState,
	key: ResourceV2ParentKey,
	value: number | undefined,
): void {
	player.resourceV2ParentLowerBounds[key] = value;
}

export function getResourceV2ParentUpperBound(
	player: PlayerState,
	key: ResourceV2ParentKey,
): number | undefined {
	return player.resourceV2ParentUpperBounds[key];
}

export function setResourceV2ParentUpperBound(
	player: PlayerState,
	key: ResourceV2ParentKey,
	value: number | undefined,
): void {
	player.resourceV2ParentUpperBounds[key] = value;
}

export function markResourceV2ParentTouched(
	player: PlayerState,
	key: ResourceV2ParentKey,
): void {
	player.resourceV2ParentTouched[key] = true;
}

export function markResourceV2ParentBoundTouched(
	player: PlayerState,
	key: ResourceV2ParentKey,
): void {
	player.resourceV2ParentBoundTouched[key] = true;
}
