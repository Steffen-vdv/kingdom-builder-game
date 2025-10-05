export { Registry } from './registry';
export type { EffectDef } from './effects';
export type { EvaluatorDef } from './evaluators';
export {
	requirementSchema,
	effectSchema,
	actionEffectGroupSchema,
	actionEffectSchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	startConfigSchema,
	gameConfigSchema,
	validateGameConfig,
} from './config/schema';
export type {
	RequirementConfig,
	EffectConfig,
	ActionEffectGroup,
	ActionEffectGroupOption,
	ActionEffect,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	PlayerStartConfig,
	StartConfig,
	GameConfig,
} from './config/schema';
