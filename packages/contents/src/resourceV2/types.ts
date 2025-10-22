import type { EffectDef } from '@kingdom-builder/protocol';

export enum ResourceV2Reconciliation {
	Clamp = 'clamp',
}

export enum ResourceV2RoundingMode {
	Up = 'up',
	Down = 'down',
	Nearest = 'nearest',
}

export interface ResourceV2DisplayDefinition {
	name: string;
	icon: string;
	description: string;
	order?: number;
	percent?: boolean;
}

export interface ResourceV2BoundsDefinition {
	lower?: number;
	upper?: number;
}

export interface ResourceV2TrackingDefinition {
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
}

export interface ResourceV2TierStepDisplayDefinition {
	summaryToken?: string;
	description?: string;
}

export interface ResourceV2TierStepDefinition {
	id: string;
	minimum: number;
	maximum?: number;
	enterEffects?: EffectDef[];
	exitEffects?: EffectDef[];
	passiveIds?: string[];
	display?: ResourceV2TierStepDisplayDefinition;
}

export interface ResourceV2TierTrackDefinition {
	id: string;
	displayName?: string;
	steps: ResourceV2TierStepDefinition[];
}

export interface ResourceV2VirtualParentDefinition {
	id: string;
	name: string;
	icon: string;
	description: string;
	order?: number;
}

export interface ResourceV2GroupDefinition {
	id: string;
	order?: number;
	parent?: ResourceV2VirtualParentDefinition;
}

export interface ResourceV2Definition {
	id: string;
	display: ResourceV2DisplayDefinition;
	bounds?: ResourceV2BoundsDefinition;
	tracking?: ResourceV2TrackingDefinition;
	tierTrack?: ResourceV2TierTrackDefinition;
	groupId?: string;
	groupOrder?: number;
}

export type ResourceV2EffectMethod =
	| 'add'
	| 'remove'
	| 'transfer'
	| 'lowerBoundIncrease'
	| 'lowerBoundDecrease'
	| 'upperBoundIncrease'
	| 'upperBoundDecrease';

export interface ResourceV2EffectDefinition {
	type: 'resourceV2';
	method: ResourceV2EffectMethod;
	params: Record<string, unknown>;
	reconciliation?: ResourceV2Reconciliation;
	round?: ResourceV2RoundingMode;
	suppressHooks?: boolean;
}
