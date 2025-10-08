import type { ResourceKey } from '../state';
import type { HappinessTierDefinition } from './tiered_resource_types';
import type { WinConditionDefinition } from './win_condition_types';

export type RuleSet = {
	defaultActionAPCost: number;
	absorptionCapPct: number;
	absorptionRounding: 'down' | 'up' | 'nearest';
	tieredResourceKey: ResourceKey;
	tierDefinitions: HappinessTierDefinition[];
	slotsPerNewLand: number;
	maxSlotsPerLand: number;
	basePopulationCap: number;
	winConditions: WinConditionDefinition[];
};
