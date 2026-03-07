/**
 * Type exports for contents-sdk.
 */

export { type ResourceKey, getResourceId } from './resource-types';
export { SystemRole, type SystemRoleValue } from './system-roles';
export {
	Focus,
	type FocusValue,
	type FocusDefinition,
	FocusDefinitions,
} from './focus';
export type { PhaseId, PhaseStepId } from './phase-types';
export type {
	ActionDef,
	BuildingDef,
	DevelopmentDef,
	Triggered,
	TriggerKey,
} from './defs';
export type {
	ContentPackage,
	ContentPackageFactory,
	ContentPackageLoader,
	ResourceCatalog,
} from './content-package';
