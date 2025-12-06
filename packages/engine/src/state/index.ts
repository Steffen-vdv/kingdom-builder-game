import type { EffectDef } from '../effects';
import type { RuntimeResourceCatalog } from '../resource-v2';

export type ResourceKey = string;
export type StatKey = string;
export type PhaseId = string;
export type PopulationRoleId = string;

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
	resourceValues: Record<string, number>;
	resourceLowerBounds: Record<string, number | null>;
	resourceUpperBounds: Record<string, number | null>;
	resourceTouched: Record<string, boolean>;
	resourceTierIds: Record<string, string | null>;
	resourceBoundTouched: Record<string, { lower: boolean; upper: boolean }>;
	statSources: Record<string, Record<string, StatSourceContribution>>;
	lands: Land[] = [];
	buildings: Set<string> = new Set();
	actions: Set<string> = new Set();
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;

	constructor(id: PlayerId, name: string) {
		this.id = id;
		this.name = name;
		this.resourceValues = {};
		this.resourceLowerBounds = {};
		this.resourceUpperBounds = {};
		this.resourceTouched = {};
		this.resourceTierIds = {};
		this.resourceBoundTouched = {};
		this.statSources = {} as Record<
			string,
			Record<string, StatSourceContribution>
		>;
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
	private _resourceCatalogV2!: RuntimeResourceCatalog;
	constructor(
		resourceCatalogV2: RuntimeResourceCatalog,
		aName = 'Player',
		bName = 'Opponent',
	) {
		this.players = [new PlayerState('A', aName), new PlayerState('B', bName)];
		this.resourceCatalogV2 = resourceCatalogV2;
	}
	get active(): PlayerState {
		return this.players[this.currentPlayerIndex]!;
	}
	get opponent(): PlayerState {
		return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
	}
	get resourceCatalogV2(): RuntimeResourceCatalog {
		return this._resourceCatalogV2;
	}
	set resourceCatalogV2(catalog: RuntimeResourceCatalog) {
		this._resourceCatalogV2 = catalog;
	}
}
