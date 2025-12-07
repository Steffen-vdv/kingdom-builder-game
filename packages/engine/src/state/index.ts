import type { EffectDef } from '../effects';
import type { RuntimeResourceCatalog } from '../resource';

export type ResourceKey = string;
export type PhaseId = string;
export type PopulationRoleId = string;

export interface ResourceSourceLink {
	type?: string;
	id?: string;
	detail?: string;
	extra?: Record<string, unknown>;
}

export interface ResourceSourceMeta {
	resourceId: string;
	longevity: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: ResourceSourceLink[];
	removal?: ResourceSourceLink;
	effect?: {
		type?: string;
		method?: string;
	};
	extra?: Record<string, unknown>;
}

export interface ResourceSourceContribution {
	amount: number;
	meta: ResourceSourceMeta;
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
	resourceSources: Record<string, Record<string, ResourceSourceContribution>>;
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
		this.resourceSources = {} as Record<
			string,
			Record<string, ResourceSourceContribution>
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
	private _resourceCatalog!: RuntimeResourceCatalog;
	constructor(
		resourceCatalog: RuntimeResourceCatalog,
		aName = 'Player',
		bName = 'Opponent',
	) {
		this.players = [new PlayerState('A', aName), new PlayerState('B', bName)];
		this.resourceCatalog = resourceCatalog;
	}
	get active(): PlayerState {
		return this.players[this.currentPlayerIndex]!;
	}
	get opponent(): PlayerState {
		return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
	}
	get resourceCatalog(): RuntimeResourceCatalog {
		return this._resourceCatalog;
	}
	set resourceCatalog(catalog: RuntimeResourceCatalog) {
		this._resourceCatalog = catalog;
	}
}
