import type {
	ResourceV2GlobalActionCost,
	ResourceV2GroupParent,
	ResourceV2TierTrack,
} from '../config/resourceV2';

export interface SessionPlayerResourceV2Snapshot {
	values: Record<string, number>;
	lowerBounds: Record<string, number | undefined>;
	upperBounds: Record<string, number | undefined>;
	touched: Record<string, boolean>;
}

export interface SessionResourceV2GroupParentSnapshot {
	id: string;
	name: string;
	order: number;
	relation: ResourceV2GroupParent['relation'];
	isPercent: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	metadata?: Record<string, unknown>;
	limited?: boolean;
	icon?: string;
	description?: string;
	lowerBound?: number;
	upperBound?: number;
	tierTrack?: ResourceV2TierTrack;
}

export interface SessionResourceV2GroupSnapshot {
	id: string;
	name: string;
	order: number;
	children: string[];
	metadata?: Record<string, unknown>;
	icon?: string;
	description?: string;
	parent?: SessionResourceV2GroupParentSnapshot;
}

export interface SessionResourceV2MetadataSnapshot {
	id: string;
	name: string;
	order: number;
	isPercent: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	metadata?: Record<string, unknown>;
	limited?: boolean;
	groupId?: string;
	parentId?: string;
	icon?: string;
	description?: string;
	lowerBound?: number;
	upperBound?: number;
	tierTrack?: ResourceV2TierTrack;
	globalActionCost?: ResourceV2GlobalActionCost;
}
