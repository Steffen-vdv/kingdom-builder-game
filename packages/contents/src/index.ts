export { ACTIONS, createActionRegistry } from './actions';
export { BUILDINGS, createBuildingRegistry } from './buildings';
export { DEVELOPMENTS, createDevelopmentRegistry } from './developments';
export { POPULATIONS, createPopulationRegistry } from './populations';
export { PHASES } from './phases';
export type { PhaseDef, StepDef } from './config/builders';
export {
	POPULATION_ROLES,
	PopulationRole,
	type PopulationRoleId,
} from './populationRoles';
export { Resource, type ResourceKey, RESOURCES } from './resources';
export { Stat, type StatKey, STATS } from './stats';
export { TRIGGER_INFO } from './triggers';
export { LAND_INFO, SLOT_INFO, DEVELOPMENTS_INFO } from './land';
export { POPULATION_INFO, POPULATION_ARCHETYPE_INFO } from './population';
export { PASSIVE_INFO } from './passive';
export { MODIFIER_INFO } from './modifiers';
export { GAME_START } from './game';
export { RULES } from './rules';
export type { ActionDef } from './actions';
export type {
	ActionEffectGroupConfig,
	ActionEffectGroupOptionConfig,
} from '@kingdom-builder/engine/config/schema';
export type { BuildingDef } from './buildings';
export type { DevelopmentDef } from './developments';
export type { PopulationDef, TriggerKey, Focus } from './defs';
export {
	ON_PAY_UPKEEP_STEP,
	ON_GAIN_INCOME_STEP,
	ON_GAIN_AP_STEP,
	BROOM_ICON,
	RESOURCE_TRANSFER_ICON,
} from './defs';
