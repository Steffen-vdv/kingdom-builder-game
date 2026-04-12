import type { EffectDef } from '../effects';
import type { RuntimeBoundValue, RuntimeResourceCatalog } from '../resource';

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
	sourceKey: string;
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

/**
 * State of a single action for a player.
 * Tracks lock states, tier progression, and exhaustion.
 */
export interface ActionState {
	/** Content-controlled lock (via action:add/remove effects) */
	locked: boolean;
	/** Engine-controlled lock (via action:pool-add/pool-remove effects) */
	poolLocked: boolean;
	/** Player's current tier for this action */
	currentTier: number;
	/** True if oneTime and completed at max tier (permanently unavailable) */
	exhausted: boolean;
	/** Number of times this action has been used this turn */
	usesThisTurn: number;
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
	resourceLowerBounds: Record<string, RuntimeBoundValue>;
	resourceUpperBounds: Record<string, RuntimeBoundValue>;
	resourceTouched: Record<string, boolean>;
	resourceTierIds: Record<string, string | null>;
	resourceBoundTouched: Record<string, { lower: boolean; upper: boolean }>;
	resourceSources: Record<string, Record<string, ResourceSourceContribution>>;
	lands: Land[] = [];
	buildings: Set<string> = new Set();
	/**
	 * @deprecated Use actionStates instead. Kept for backwards compatibility.
	 */
	actions: Set<string> = new Set();
	/**
	 * Action states for all actions. Tracks lock states, tier progression,
	 * and exhaustion. Replaces the old `actions` string set.
	 */
	actionStates: Record<string, ActionState> = {};
	/**
	 * Total binding resource spent per meta-category. Used for tier
	 * progression curve calculations in pooled meta-categories.
	 */
	metaCategoryBindingSpent: Record<string, number> = {};
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

	/**
	 * Checks if an action is available (can be performed) by the player.
	 * An action is available when it's not content-locked AND not pool-locked.
	 *
	 * Note: This method does NOT check the action's system status - system
	 * actions should be filtered at a higher level using the action registry.
	 * Use the helper functions in pool/fillAlgorithm.ts for complete checks.
	 */
	isActionAvailable(actionId: string): boolean {
		const state = this.actionStates[actionId];
		if (!state) {
			return false;
		}
		return !state.locked && !state.poolLocked;
	}

	/**
	 * Checks if an action is a pool candidate (can be added to the pool).
	 * An action is a candidate when it's pool-locked but not content-locked
	 * and not exhausted.
	 *
	 * Note: This method does NOT check the action's system status - system
	 * actions should be filtered at a higher level using the action registry.
	 * Use the helper functions in pool/fillAlgorithm.ts for complete checks.
	 */
	isPoolCandidate(actionId: string): boolean {
		const state = this.actionStates[actionId];
		if (!state) {
			return false;
		}
		return !state.locked && state.poolLocked && !state.exhausted;
	}
}

export class GameState {
	turn = 1;
	currentPlayerIndex = 0; // multi-player friendly
	currentPhase = '';
	currentStep = '';
	phaseIndex = 0;
	stepIndex = 0;
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
