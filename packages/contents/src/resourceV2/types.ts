export enum ResourceV2ReconciliationStrategy {
	Clamp = 'clamp',
}

export enum ResourceV2RoundingMode {
	Up = 'up',
	Down = 'down',
	Nearest = 'nearest',
}

export interface ResourceV2DisplayMetadata {
	icon: string;
	label: string;
	description: string;
	order: number;
	percent?: boolean;
}

export interface ResourceV2BoundsConfig {
	lowerBound?: number;
	upperBound?: number;
}

export interface ResourceV2TierStepDisplay {
	label?: string;
	summaryToken?: string;
}

export interface ResourceV2TierStep {
	id: string;
	min: number;
	max?: number;
	display?: ResourceV2TierStepDisplay;
	enterEffects?: string[];
	exitEffects?: string[];
	passives?: string[];
}

export interface ResourceV2TierTrackDisplay {
	title?: string;
	summaryToken?: string;
}

export interface ResourceV2TierTrack {
	id: string;
	steps: ResourceV2TierStep[];
	display?: ResourceV2TierTrackDisplay;
}

export interface ResourceV2GroupParentMetadata
	extends ResourceV2DisplayMetadata {
	id: string;
	limited: true;
}

export type ResourceV2GroupParentInput = Omit<
	ResourceV2GroupParentMetadata,
	'limited'
> & {
	limited?: boolean;
};

export interface ResourceV2GroupMetadata {
	groupId: string;
	order: number;
	parent?: ResourceV2GroupParentMetadata;
}

export interface ResourceV2GlobalActionCostConfig {
	amount: number;
}

export interface ResourceV2Definition {
	id: string;
	display: ResourceV2DisplayMetadata;
	bounds?: ResourceV2BoundsConfig;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	tierTrack?: ResourceV2TierTrack;
	group?: ResourceV2GroupMetadata;
	globalActionCost?: ResourceV2GlobalActionCostConfig;
}

export interface ResourceV2ValueEffectDefinition {
	kind: 'resource:add' | 'resource:remove';
	resourceId: string;
	amount: number;
	reconciliation: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export interface ResourceV2TransferEndpointDefinition {
	resourceId: string;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2TransferEffectDefinition {
	kind: 'resource:transfer';
	donor: ResourceV2TransferEndpointDefinition;
	recipient: ResourceV2TransferEndpointDefinition;
	amount: number;
	suppressHooks?: boolean;
}

export interface ResourceV2BoundAdjustmentDefinition {
	kind: 'resource:lower-bound:increase' | 'resource:upper-bound:increase';
	resourceId: string;
	amount: number;
	reconciliation: ResourceV2ReconciliationStrategy;
}
