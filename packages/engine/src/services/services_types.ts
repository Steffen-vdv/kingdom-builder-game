import type { ResourceKey } from '../state';
import type { RuntimeResourceTierTrackMetadata } from '../resource';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { WinConditionDefinition } from './win_condition_types';

export type CorePhaseIds = {
	growth: string;
	upkeep: string;
};

export type RuleSet = {
	defaultActionAPCost: number;
	absorptionCapPct: number;
	absorptionRounding: 'down' | 'up' | 'nearest';
	tieredResourceKey: ResourceKey;
	tieredResourceId?: string;
	tierTrackMetadata?: RuntimeResourceTierTrackMetadata;
	tierDefinitions: HappinessTierDefinition[];
	slotsPerNewLand: number;
	maxSlotsPerLand: number;
	basePopulationCap: number;
	winConditions: WinConditionDefinition[];
	corePhaseIds?: CorePhaseIds;
};
