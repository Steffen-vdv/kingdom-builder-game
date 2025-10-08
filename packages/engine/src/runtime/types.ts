import type { EffectDef } from '../effects';
import type { PhaseDef } from '../phases';
import type { AdvanceSkip } from '../phases/advance';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type { PlayerId, StatSourceContribution, ResourceKey } from '../state';
import type {
	HappinessTierDefinition,
	PassiveMetadata,
	PassiveSummary,
	PhaseSkipConfig,
} from '../services';

export interface LandSnapshot {
	id: string;
	slotsMax: number;
	slotsUsed: number;
	tilled: boolean;
	developments: string[];
	upkeep?: Record<string, number>;
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
}

export interface PlayerStateSnapshot {
	id: PlayerId;
	name: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	statsHistory: Record<string, boolean>;
	population: Record<string, number>;
	lands: LandSnapshot[];
	buildings: string[];
	actions: string[];
	statSources: Record<
		string,
		Record<
			string,
			{
				amount: number;
				meta: StatSourceContribution['meta'];
			}
		>
	>;
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	passives: PassiveSummary[];
}

export interface GameSnapshot {
	turn: number;
	currentPlayerIndex: number;
	currentPhase: string;
	currentStep: string;
	phaseIndex: number;
	stepIndex: number;
	devMode: boolean;
	players: PlayerStateSnapshot[];
	activePlayerId: PlayerId;
	opponentId: PlayerId;
}

export interface AdvanceSkipSourceSnapshot {
	id: string;
	detail?: string;
	meta?: PassiveMetadata;
}

export interface AdvanceSkipSnapshot {
	type: AdvanceSkip['type'];
	phaseId: string;
	stepId?: string;
	sources: AdvanceSkipSourceSnapshot[];
}

export interface EngineAdvanceResult {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: PlayerStateSnapshot;
	skipped?: AdvanceSkipSnapshot;
}

export interface RuleSnapshot {
	tieredResourceKey: ResourceKey;
	tierDefinitions: HappinessTierDefinition[];
}

export type PassiveRecordSnapshot = PassiveSummary & {
	owner: PlayerId;
	detail?: string;
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	skip?: PhaseSkipConfig;
	[key: string]: unknown;
};

export interface EngineSessionSnapshot {
	game: GameSnapshot;
	phases: PhaseDef[];
	actionCostResource: ResourceKey;
	recentResourceGains: { key: ResourceKey; amount: number }[];
	compensations: Record<PlayerId, PlayerStartConfig>;
	rules: RuleSnapshot;
	passiveRecords: Record<PlayerId, PassiveRecordSnapshot[]>;
}
