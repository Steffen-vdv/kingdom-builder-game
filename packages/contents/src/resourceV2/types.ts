import type { EffectConfig } from '@kingdom-builder/protocol';

export enum ResourceV2Reconciliation {
	Clamp = 'clamp',
}

export enum ResourceV2PercentRoundingMode {
	Down = 'down',
	Up = 'up',
	Nearest = 'nearest',
}

export interface ResourceV2PercentDeltaDefinition {
	percent: number;
	rounding: ResourceV2PercentRoundingMode;
}

export interface ResourceV2FlatDeltaDefinition {
	amount: number;
}

export type ResourceV2DeltaDefinition =
	| ResourceV2FlatDeltaDefinition
	| ResourceV2PercentDeltaDefinition;

export interface ResourceV2VirtualParentMetadata {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	order?: number;
}

export interface ResourceV2GroupMetadata {
	groupId: string;
	order?: number;
	parent: ResourceV2VirtualParentMetadata;
}

export interface ResourceV2TierStepDefinition {
	id: string;
	minimum: number;
	maximum?: number;
	enterEffects?: EffectConfig[];
	exitEffects?: EffectConfig[];
	suppressHooks?: true;
}

export interface ResourceV2TierTrackDefinition {
	id: string;
	name: string;
	summaryToken?: string;
	steps: ResourceV2TierStepDefinition[];
}

export interface ResourceV2Definition {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	order?: number;
	isPercent?: boolean;
	lowerBound?: number;
	upperBound?: number;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	group?: ResourceV2GroupMetadata;
	tierTrack?: ResourceV2TierTrackDefinition;
	limitedToChildren?: boolean;
}

export interface ResourceV2MutationTarget {
	id: string;
	limitedToChildren?: boolean;
}

interface ResourceV2MutationBase {
	resourceId: string;
}

interface ResourceV2HookSuppressible {
	suppressHooks?: true;
}

export interface ResourceV2ValueMutationDefinition
	extends ResourceV2MutationBase,
		ResourceV2HookSuppressible {
	kind: 'value';
	operation: 'add' | 'remove';
	delta: ResourceV2DeltaDefinition;
	reconciliation: ResourceV2Reconciliation.Clamp;
}

export interface ResourceV2TransferMutationDefinition
	extends ResourceV2HookSuppressible {
	kind: 'transfer';
	fromResourceId: string;
	toResourceId: string;
	amount: number;
	donorReconciliation: ResourceV2Reconciliation.Clamp;
	recipientReconciliation: ResourceV2Reconciliation.Clamp;
}

export interface ResourceV2BoundMutationDefinition
	extends ResourceV2MutationBase {
	kind: 'bound';
	bound: 'lower' | 'upper';
	operation: 'increase';
	amount: number;
}

export type ResourceV2EffectDefinition =
	| ResourceV2ValueMutationDefinition
	| ResourceV2TransferMutationDefinition
	| ResourceV2BoundMutationDefinition;
