/**
 * @kingdom-builder/contents-sdk
 *
 * Game-agnostic infrastructure for defining content packages.
 * Games import these builders, types, and utilities to define their content.
 */

// Types - generic definitions for content packages
export * from './types';

// Builder shared constants and base classes
export {
	Types,
	LandMethods,
	ResourceMethods,
	ResourceLowerBoundMethods,
	ResourceUpperBoundMethods,
	BuildingMethods,
	DevelopmentMethods,
	PassiveMethods,
	CostModMethods,
	ResultModMethods,
	ActionMethods,
	AttackMethods,
	RequirementTypes,
	ParamsBuilder,
} from './builders/builderShared';
export type { Params } from './builders/builderShared';

// Resource builders and utilities
export * from './builders/resource';

// Domain builders (action, building, development, etc.)
export * from './builders/builders';

// Text utilities
export { formatPassiveRemoval } from './builders/text';

// Resource effect helpers
export {
	resourceAmountChange,
	resourcePercentFromResourceChange,
	resourceTransferAmount,
	resourceTransferPercent,
} from './builders/helpers/resourceEffects';

// Action helpers
export {
	getCategoryOrder,
	createResourceChangeList,
	mapToResourceChangeList,
	costsToResourceChangeList,
} from './builders/helpers/actionHelpers';
