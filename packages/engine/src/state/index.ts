import type { EffectDef } from '../effects';
import type { RuntimeResourceCatalog } from '../resource-v2';

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

function toHyphenatedCamel(value: string): string {
	let result = '';
	for (let index = 0; index < value.length; index++) {
		const char = value[index] ?? '';
		const lower = char.toLowerCase();
		const isLetter = char.toLowerCase() !== char.toUpperCase();
		const isUpper = isLetter && char === char.toUpperCase();
		if (index > 0) {
			const previous = value[index - 1] ?? '';
			const previousLetter = previous.toLowerCase() !== previous.toUpperCase();
			const previousUpper =
				previousLetter && previous === previous.toUpperCase();
			if (isUpper && !previousUpper) {
				result += '-';
			} else if (!isUpper && previousUpper) {
				const prior = value[index - 2] ?? '';
				const priorUpper =
					prior.toLowerCase() !== prior.toUpperCase() &&
					prior === prior.toUpperCase();
				if (priorUpper) {
					result += '-';
				}
			}
		}
		result += lower;
	}
	return result;
}

function toNormalizedSlug(value: string): string {
	const tokens = value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (tokens.length === 0) {
		return '';
	}
	const parts = tokens.map((token) => toHyphenatedCamel(token));
	return parts
		.join('-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

function toLabelAcronym(value: string): string {
	return value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment[0]!.toLowerCase())
		.join('');
}

function extractResourceSlug(resourceId: string): string {
	const delimiterIndex = resourceId.lastIndexOf(':');
	if (delimiterIndex === -1) {
		return resourceId;
	}
	return resourceId.slice(delimiterIndex + 1);
}

function computeLegacyResourceMapping(
	catalog: RuntimeResourceCatalog,
	previous: Partial<Record<ResourceKey, string>>,
): Partial<Record<ResourceKey, string>> {
	const keys = Object.values(Resource);
	const normalizedByKey = new Map<string, string>();
	for (const key of keys) {
		normalizedByKey.set(key, toNormalizedSlug(key));
	}
	const next: Partial<Record<ResourceKey, string>> = { ...previous };
	const unmatched = new Set(keys);
	for (const definition of catalog.resources.ordered) {
		const resourceId = extractResourceSlug(definition.id);
		const slug = toNormalizedSlug(resourceId);
		for (const key of keys) {
			if (!unmatched.has(key)) {
				continue;
			}
			if (slug === normalizedByKey.get(key)) {
				next[key] = definition.id;
				unmatched.delete(key);
			}
		}
	}
	if (unmatched.size > 0) {
		for (const definition of catalog.resources.ordered) {
			const labelSlug = toNormalizedSlug(definition.label);
			const acronym = toLabelAcronym(definition.label);
			for (const key of Array.from(unmatched)) {
				const normalizedKey = normalizedByKey.get(key);
				if (labelSlug === normalizedKey || acronym === key.toLowerCase()) {
					next[key] = definition.id;
					unmatched.delete(key);
				}
			}
			if (unmatched.size === 0) {
				break;
			}
		}
	}
	return next;
}

function computeLegacyStatMapping(
	catalog: RuntimeResourceCatalog,
	previous: Partial<Record<StatKey, string>>,
): Partial<Record<StatKey, string>> {
	const keys = Object.values(Stat);
	const normalizedByKey = new Map<string, string>();
	for (const key of keys) {
		normalizedByKey.set(key, toNormalizedSlug(key));
	}
	const next: Partial<Record<StatKey, string>> = { ...previous };
	for (const definition of catalog.resources.ordered) {
		if (!definition.id.startsWith('resource:stat:')) {
			continue;
		}
		const slug = toNormalizedSlug(extractResourceSlug(definition.id));
		for (const key of keys) {
			if (slug === normalizedByKey.get(key)) {
				next[key] = definition.id;
			}
		}
	}
	return next;
}

function computeLegacyPopulationMapping(
	catalog: RuntimeResourceCatalog,
	previous: Partial<Record<PopulationRoleId, string>>,
): Partial<Record<PopulationRoleId, string>> {
	const keys = Object.values(PopulationRole);
	const next: Partial<Record<PopulationRoleId, string>> = { ...previous };
	for (const definition of catalog.resources.ordered) {
		if (!definition.id.startsWith('resource:population:role:')) {
			continue;
		}
		const slug = extractResourceSlug(definition.id);
		for (const key of keys) {
			if (slug === key) {
				next[key] = definition.id;
			}
		}
	}
	return next;
}

function rehomeNumericRecord(
	record: Record<string, number>,
	from: string,
	to: string,
): void {
	if (from === to) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, from)) {
		return;
	}
	const value = record[from];
	const hasTarget = Object.prototype.hasOwnProperty.call(record, to);
	if (!hasTarget && value !== undefined) {
		record[to] = value;
	}
	delete record[from];
}

function rehomeNullableNumberRecord(
	record: Record<string, number | null>,
	from: string,
	to: string,
): void {
	if (from === to) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, from)) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, to)) {
		record[to] = record[from] ?? null;
	}
	delete record[from];
}

function rehomeBooleanRecord(
	record: Record<string, boolean>,
	from: string,
	to: string,
): void {
	if (from === to) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, from)) {
		return;
	}
	const fromValue = Boolean(record[from]);
	record[to] = Boolean(record[to]) || fromValue;
	delete record[from];
}

function rehomeNullableStringRecord(
	record: Record<string, string | null>,
	from: string,
	to: string,
): void {
	if (from === to) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, from)) {
		return;
	}
	if (!Object.prototype.hasOwnProperty.call(record, to)) {
		record[to] = record[from] ?? null;
	}
	delete record[from];
}

function rehomeBoundTouchedRecord(
	record: Record<string, { lower: boolean; upper: boolean }>,
	from: string,
	to: string,
): void {
	if (from === to) {
		return;
	}
	const source = record[from];
	if (!source) {
		return;
	}
	const target = record[to];
	if (target) {
		target.lower = target.lower || source.lower;
		target.upper = target.upper || source.upper;
	} else {
		record[to] = { lower: source.lower, upper: source.upper };
	}
	delete record[from];
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
	resourceValues: Record<string, number>;
	resourceLowerBounds: Record<string, number | null>;
	resourceUpperBounds: Record<string, number | null>;
	resourceTouched: Record<string, boolean>;
	resourceTierIds: Record<string, string | null>;
	resourceBoundTouched: Record<string, { lower: boolean; upper: boolean }>;
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
	statSources: Record<string, Record<string, StatSourceContribution>>;
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
	private legacyResourceToResourceId: Partial<Record<ResourceKey, string>> = {};
	private legacyStatToResourceId: Partial<Record<string, string>> = {};
	private legacyPopulationToResourceId: Partial<
		Record<PopulationRoleId, string>
	> = {};
	constructor(id: PlayerId, name: string) {
		this.id = id;
		this.name = name;
		this.resources = {};
		this.resourceValues = {};
		this.resourceLowerBounds = {};
		this.resourceUpperBounds = {};
		this.resourceTouched = {};
		this.resourceTierIds = {};
		this.resourceBoundTouched = {};
		this.syncLegacyResourceAccessors();
		this.stats = {};
		this.statsHistory = {};
		this.statSources = {} as Record<
			string,
			Record<string, StatSourceContribution>
		>;
		this.syncLegacyStatAccessors();
		this.population = {};
		this.syncLegacyPopulationAccessors();
		this.skipPhases = {};
		this.skipSteps = {};
	}

	private getResourceV2IdForResource(key: ResourceKey): string {
		return this.legacyResourceToResourceId[key] ?? key;
	}

	getResourceV2Id(key: ResourceKey): string {
		return this.getResourceV2IdForResource(key);
	}

	private getResourceV2IdForStat(key: string): string {
		return this.legacyStatToResourceId[key] ?? key;
	}

	getStatResourceV2Id(key: string): string {
		return this.getResourceV2IdForStat(key);
	}

	private getResourceV2IdForPopulation(key: PopulationRoleId): string {
		return this.legacyPopulationToResourceId[key] ?? key;
	}

	getPopulationResourceV2Id(key: PopulationRoleId): string {
		return this.getResourceV2IdForPopulation(key);
	}

	private syncLegacyResourceAccessors(): ResourceKey[] {
		const resourceKeys = Object.values(Resource);
		for (const key of resourceKeys) {
			const getter = (): number => this.getLegacyResourceValue(key);
			const setter = (value: number): void => {
				this.setLegacyResourceValue(key, value);
			};
			Object.defineProperty(this.resources, key, {
				get: getter,
				set: setter,
				enumerable: true,
				configurable: true,
			});
			Object.defineProperty(this, key, {
				get: getter,
				set: setter,
				enumerable: false,
				configurable: true,
			});
		}
		return resourceKeys;
	}

	private syncLegacyStatAccessors(): StatKey[] {
		const statKeys = Object.values(Stat);
		for (const key of statKeys) {
			if (!Object.prototype.hasOwnProperty.call(this.statsHistory, key)) {
				this.statsHistory[key] = false;
			}
			const resourceId = this.getResourceV2IdForStat(key);
			if (!Object.prototype.hasOwnProperty.call(this.statSources, resourceId)) {
				this.statSources[resourceId] = {};
			}
			const getter = (): number => this.getLegacyStatValue(key);
			const setter = (value: number): void => {
				this.setLegacyStatValue(key, value);
			};
			Object.defineProperty(this.stats, key, {
				get: getter,
				set: setter,
				enumerable: true,
				configurable: true,
			});
			Object.defineProperty(this, key, {
				get: getter,
				set: setter,
				enumerable: false,
				configurable: true,
			});
		}
		return statKeys;
	}

	private syncLegacyPopulationAccessors(): PopulationRoleId[] {
		const populationKeys = Object.values(PopulationRole);
		for (const key of populationKeys) {
			const getter = (): number => this.getLegacyPopulationValue(key);
			const setter = (value: number): void => {
				this.setLegacyPopulationValue(key, value);
			};
			Object.defineProperty(this.population, key, {
				get: getter,
				set: setter,
				enumerable: true,
				configurable: true,
			});
		}
		return populationKeys;
	}

	private getLegacyResourceValue(key: ResourceKey): number {
		const resourceId = this.getResourceV2IdForResource(key);
		return this.resourceValues[resourceId] ?? 0;
	}

	private setLegacyResourceValue(key: ResourceKey, value: number): void {
		const resourceId = this.getResourceV2IdForResource(key);
		this.resourceValues[resourceId] = value;
	}

	private getLegacyStatValue(key: StatKey): number {
		const resourceId = this.getResourceV2IdForStat(key);
		return this.resourceValues[resourceId] ?? 0;
	}

	private setLegacyStatValue(key: StatKey, value: number): void {
		const resourceId = this.getResourceV2IdForStat(key);
		const previous = this.resourceValues[resourceId] ?? 0;
		this.resourceValues[resourceId] = value;
		if (previous !== value) {
			this.resourceTouched[resourceId] = true;
		}
		if (this.resourceTouched[resourceId]) {
			this.statsHistory[key] = true;
		}
	}

	private getLegacyPopulationValue(key: PopulationRoleId): number {
		const resourceId = this.getResourceV2IdForPopulation(key);
		return this.resourceValues[resourceId] ?? 0;
	}

	private setLegacyPopulationValue(key: PopulationRoleId, value: number): void {
		const resourceId = this.getResourceV2IdForPopulation(key);
		this.resourceValues[resourceId] = value;
	}

	copyLegacyMappingsFrom(source: PlayerState): void {
		this.legacyResourceToResourceId = { ...source.legacyResourceToResourceId };
		this.legacyStatToResourceId = { ...source.legacyStatToResourceId };
		this.legacyPopulationToResourceId = {
			...source.legacyPopulationToResourceId,
		};
	}

	syncLegacyResourceCatalog(catalog: RuntimeResourceCatalog): void {
		const resourceKeys = this.syncLegacyResourceAccessors();
		const statKeys = this.syncLegacyStatAccessors();
		const populationKeys = this.syncLegacyPopulationAccessors();
		const nextResourceMap = computeLegacyResourceMapping(
			catalog,
			this.legacyResourceToResourceId,
		);
		const nextStatMap = computeLegacyStatMapping(
			catalog,
			this.legacyStatToResourceId,
		);
		const nextPopulationMap = computeLegacyPopulationMapping(
			catalog,
			this.legacyPopulationToResourceId,
		);
		this.rehomeLegacyState(
			resourceKeys,
			this.legacyResourceToResourceId,
			nextResourceMap,
		);
		this.rehomeLegacyState(statKeys, this.legacyStatToResourceId, nextStatMap);
		this.rehomeLegacyState(
			populationKeys,
			this.legacyPopulationToResourceId,
			nextPopulationMap,
		);
		this.legacyResourceToResourceId = nextResourceMap;
		this.legacyStatToResourceId = nextStatMap;
		this.legacyPopulationToResourceId = nextPopulationMap;
	}

	private rehomeLegacyState(
		keys: readonly string[],
		previous: Partial<Record<string, string>>,
		next: Partial<Record<string, string>>,
	): void {
		for (const key of keys) {
			const previousId = previous[key] ?? key;
			const nextId = next[key];
			if (!nextId || previousId === nextId) {
				continue;
			}
			rehomeNumericRecord(this.resourceValues, previousId, nextId);
			rehomeNullableNumberRecord(this.resourceLowerBounds, previousId, nextId);
			rehomeNullableNumberRecord(this.resourceUpperBounds, previousId, nextId);
			rehomeBooleanRecord(this.resourceTouched, previousId, nextId);
			rehomeNullableStringRecord(this.resourceTierIds, previousId, nextId);
			rehomeBoundTouchedRecord(this.resourceBoundTouched, previousId, nextId);
			if (Object.prototype.hasOwnProperty.call(this.statSources, previousId)) {
				const existing = this.statSources[previousId];
				const target = this.statSources[nextId] ?? {};
				this.statSources[nextId] = { ...target, ...existing };
				delete this.statSources[previousId];
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
	private _resourceCatalogV2: RuntimeResourceCatalog | undefined;
	constructor(aName = 'Player', bName = 'Opponent') {
		this.players = [new PlayerState('A', aName), new PlayerState('B', bName)];
	}
	get active(): PlayerState {
		return this.players[this.currentPlayerIndex]!;
	}
	get opponent(): PlayerState {
		return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
	}
	get resourceCatalogV2(): RuntimeResourceCatalog | undefined {
		return this._resourceCatalogV2;
	}
	set resourceCatalogV2(catalog: RuntimeResourceCatalog | undefined) {
		this._resourceCatalogV2 = catalog;
		if (!catalog) {
			return;
		}
		for (const player of this.players) {
			player.syncLegacyResourceCatalog(catalog);
		}
	}
}
