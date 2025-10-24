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

export const ResourceV2: Record<string, string> = {};
export type ResourceV2Key = string;

export interface PlayerResourceV2State {
	values: Record<ResourceV2Key, number>;
	lowerBounds: Record<ResourceV2Key, number | undefined>;
	upperBounds: Record<ResourceV2Key, number | undefined>;
	touched: Record<ResourceV2Key, boolean>;
}

export interface ResourceV2GlobalActionCostRuntime {
	resourceId: ResourceV2Key;
	amount: number;
}

let resourceV2Catalog: ResourceV2RuntimeCatalog | undefined;
let resourceV2OrderedIds: ResourceV2Key[] = [];
let resourceV2Definitions: Record<ResourceV2Key, ResourceV2RuntimeDefinition> =
	{};
let resourceV2GlobalActionCost: ResourceV2GlobalActionCostRuntime | undefined;

const resetResourceV2Registry = () => {
	for (const key of Object.keys(ResourceV2)) {
		delete ResourceV2[key];
	}
	resourceV2Catalog = undefined;
	resourceV2OrderedIds = [];
	resourceV2Definitions = {};
	resourceV2GlobalActionCost = undefined;
};

const createResourceV2Record = <T>(
	factory: (definition: ResourceV2RuntimeDefinition) => T,
): Record<ResourceV2Key, T> => {
	const record: Record<ResourceV2Key, T> = {} as Record<ResourceV2Key, T>;
	for (const id of resourceV2OrderedIds) {
		const definition = resourceV2Definitions[id];
		if (!definition) {
			continue;
		}
		record[id] = factory(definition);
	}
	return record;
};

export function setResourceV2Keys(catalog?: ResourceV2RuntimeCatalog): void {
	resetResourceV2Registry();
	if (!catalog) {
		return;
	}
	resourceV2Catalog = catalog;
	resourceV2OrderedIds = [...catalog.orderedResourceIds];
	resourceV2Definitions = {};
	const candidates: ResourceV2RuntimeDefinition[] = [];
	for (const id of resourceV2OrderedIds) {
		const definition = catalog.resourcesById[id];
		if (!definition) {
			continue;
		}
		ResourceV2[id] = id;
		resourceV2Definitions[id] = definition;
		if (definition.globalActionCost) {
			candidates.push(definition);
		}
	}
	if (candidates.length > 1) {
		const ids = candidates
			.map((definition) => definition.id)
			.sort()
			.join(', ');
		throw new Error(
			'Multiple ResourceV2 definitions declare globalActionCost: ' +
				ids +
				'. Only one resource can define a global action cost.',
		);
	}
	if (candidates.length === 1) {
		const definition = candidates[0];
		if (!definition) {
			return;
		}
		const amount = definition.globalActionCost?.amount;
		if (amount === undefined) {
			throw new Error(
				'ResourceV2 definition ' +
					definition.id +
					' is missing a globalActionCost amount.',
			);
		}
		resourceV2GlobalActionCost = {
			resourceId: definition.id,
			amount,
		} satisfies ResourceV2GlobalActionCostRuntime;
	}
}

export function getResourceV2Catalog(): ResourceV2RuntimeCatalog | undefined {
	return resourceV2Catalog;
}

export function getResourceV2GlobalActionCost():
	| ResourceV2GlobalActionCostRuntime
	| undefined {
	return resourceV2GlobalActionCost;
}

export function getResourceV2Keys(): ResourceV2Key[] {
	return [...resourceV2OrderedIds];
}

export function getResourceV2Definition(
	key: ResourceV2Key,
): ResourceV2RuntimeDefinition | undefined {
	return resourceV2Definitions[key];
}

export function createPlayerResourceV2State(): PlayerResourceV2State {
	return {
		values: createResourceV2Record(() => 0),
		lowerBounds: createResourceV2Record((definition) => definition.lowerBound),
		upperBounds: createResourceV2Record((definition) => definition.upperBound),
		touched: createResourceV2Record(() => false),
	};
}

export function cloneResourceV2State(
	state: PlayerResourceV2State,
): PlayerResourceV2State {
	return {
		values: { ...state.values },
		lowerBounds: { ...state.lowerBounds },
		upperBounds: { ...state.upperBounds },
		touched: { ...state.touched },
	};
}

export function setPlayerResourceV2Value(
	state: PlayerResourceV2State,
	key: ResourceV2Key,
	value: number,
): void {
	const current = state.values[key];
	state.values[key] = value;
	if (current !== undefined && current === value) {
		return;
	}
	if (value !== 0) {
		state.touched[key] = true;
	}
}

export function setPlayerResourceV2LowerBound(
	state: PlayerResourceV2State,
	key: ResourceV2Key,
	bound: number | undefined,
): void {
	state.lowerBounds[key] = bound;
}

export function setPlayerResourceV2UpperBound(
	state: PlayerResourceV2State,
	key: ResourceV2Key,
	bound: number | undefined,
): void {
	state.upperBounds[key] = bound;
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
		this.resourceV2 = createPlayerResourceV2State();
	}

	setResourceV2Value(key: ResourceV2Key, value: number): void {
		setPlayerResourceV2Value(this.resourceV2, key, value);
	}

	getResourceV2Value(key: ResourceV2Key): number {
		return this.resourceV2.values[key] ?? 0;
	}

	setResourceV2LowerBound(key: ResourceV2Key, bound: number | undefined): void {
		setPlayerResourceV2LowerBound(this.resourceV2, key, bound);
	}

	getResourceV2LowerBound(key: ResourceV2Key): number | undefined {
		return this.resourceV2.lowerBounds[key];
	}

	setResourceV2UpperBound(key: ResourceV2Key, bound: number | undefined): void {
		setPlayerResourceV2UpperBound(this.resourceV2, key, bound);
	}

	getResourceV2UpperBound(key: ResourceV2Key): number | undefined {
		return this.resourceV2.upperBounds[key];
	}

	hasResourceV2BeenTouched(key: ResourceV2Key): boolean {
		return Boolean(this.resourceV2.touched[key]);
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
