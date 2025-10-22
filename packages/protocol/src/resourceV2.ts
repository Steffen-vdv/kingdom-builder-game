import { z } from 'zod';

import { effectSchema } from './config/schema';
import type { EffectDef } from './effects';

export interface ResourceV2DisplayMetadata {
	readonly name: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order: number;
	readonly displayAsPercent?: boolean;
}

export const resourceV2DisplayMetadataSchema = z.object({
	name: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().int(),
	displayAsPercent: z.boolean().optional(),
});

export interface ResourceV2BoundsMetadata {
	readonly lowerBound?: number;
	readonly upperBound?: number;
}

export const resourceV2BoundsMetadataSchema = z
	.object({
		lowerBound: z.number().int().optional(),
		upperBound: z.number().int().optional(),
	})
	.refine(
		(value) => {
			if (
				value.lowerBound !== undefined &&
				value.upperBound !== undefined &&
				value.lowerBound > value.upperBound
			) {
				return false;
			}

			return true;
		},
		{
			message: 'lowerBound cannot be greater than upperBound',
		},
	);

export interface ResourceV2TierRange {
	readonly min: number;
	readonly max?: number;
}

export const resourceV2TierRangeSchema = z
	.object({
		min: z.number().int(),
		max: z.number().int().optional(),
	})
	.refine(
		(value) => {
			if (value.max === undefined) {
				return true;
			}

			return value.max > value.min;
		},
		{
			message: 'max must be greater than min when specified',
		},
	);

export interface ResourceV2TierDisplayMetadata {
	readonly title?: string;
	readonly icon?: string;
	readonly summary?: string;
	readonly description?: string;
	readonly removalCondition?: string;
}

export const resourceV2TierDisplayMetadataSchema = z.object({
	title: z.string().optional(),
	icon: z.string().optional(),
	summary: z.string().optional(),
	description: z.string().optional(),
	removalCondition: z.string().optional(),
});

export interface ResourceV2TierDefinition {
	readonly id: string;
	readonly range: ResourceV2TierRange;
	readonly enterEffects?: ReadonlyArray<EffectDef>;
	readonly exitEffects?: ReadonlyArray<EffectDef>;
	readonly display?: ResourceV2TierDisplayMetadata;
}

export const resourceV2TierDefinitionSchema = z.object({
	id: z.string(),
	range: resourceV2TierRangeSchema,
	enterEffects: z.array(effectSchema).optional(),
	exitEffects: z.array(effectSchema).optional(),
	display: resourceV2TierDisplayMetadataSchema.optional(),
});

export interface ResourceV2TierTrackDefinition {
	readonly id: string;
	readonly tiers: ReadonlyArray<ResourceV2TierDefinition>;
}

export const resourceV2TierTrackDefinitionSchema = z
	.object({
		id: z.string(),
		tiers: z.array(resourceV2TierDefinitionSchema).min(1),
	})
	.refine(
		(value) =>
			value.tiers.every((tier, index) => {
				if (index === 0) {
					return true;
				}

				return tier.range.min >= value.tiers[index - 1]!.range.min;
			}),
		{
			message: 'tier ranges must be ordered by ascending minimum values',
		},
	);

export interface ResourceV2GroupParentDescriptor {
	readonly id: string;
	readonly display: ResourceV2DisplayMetadata;
	readonly bounds?: ResourceV2BoundsMetadata;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
	readonly tierTrack?: ResourceV2TierTrackDefinition;
	readonly relation: 'sumOfAll';
}

export const resourceV2GroupParentDescriptorSchema = z.object({
	id: z.string(),
	display: resourceV2DisplayMetadataSchema,
	bounds: resourceV2BoundsMetadataSchema.optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackDefinitionSchema.optional(),
	relation: z.literal('sumOfAll'),
});

export interface ResourceV2GroupDefinition {
	readonly id: string;
	readonly order: number;
	readonly parent: ResourceV2GroupParentDescriptor;
	readonly children: ReadonlyArray<string>;
}

export const resourceV2GroupDefinitionSchema = z.object({
	id: z.string(),
	order: z.number().int(),
	parent: resourceV2GroupParentDescriptorSchema,
	children: z.array(z.string()).min(1),
});

export interface ResourceV2GroupMembershipDescriptor {
	readonly groupId: string;
	readonly order: number;
}

export const resourceV2GroupMembershipDescriptorSchema = z.object({
	groupId: z.string(),
	order: z.number().int(),
});

export interface ResourceV2GlobalActionCostMetadata {
	readonly amount: number;
}

export const resourceV2GlobalActionCostMetadataSchema = z.object({
	amount: z.number().int().positive(),
});

export interface ResourceV2Definition {
	readonly id: string;
	readonly display: ResourceV2DisplayMetadata;
	readonly bounds?: ResourceV2BoundsMetadata;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
	readonly tierTrack?: ResourceV2TierTrackDefinition;
	readonly group?: ResourceV2GroupMembershipDescriptor;
	readonly globalActionCost?: ResourceV2GlobalActionCostMetadata;
}

export const resourceV2DefinitionSchema = z.object({
	id: z.string(),
	display: resourceV2DisplayMetadataSchema,
	bounds: resourceV2BoundsMetadataSchema.optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackDefinitionSchema.optional(),
	group: resourceV2GroupMembershipDescriptorSchema.optional(),
	globalActionCost: resourceV2GlobalActionCostMetadataSchema.optional(),
});

export interface ResourceV2RecentGainEntry {
	readonly resourceId: string;
	readonly delta: number;
}

export const resourceV2RecentGainEntrySchema = z
	.object({
		resourceId: z.string(),
		delta: z.number().int(),
	})
	.refine((value) => value.delta !== 0, {
		message: 'recent gain entries must capture non-zero deltas',
	});

export interface ResourceV2RegistryPayload {
	readonly resources: ReadonlyArray<ResourceV2Definition>;
	readonly groups: ReadonlyArray<ResourceV2GroupDefinition>;
}

export const resourceV2RegistryPayloadSchema = z.object({
	resources: z.array(resourceV2DefinitionSchema),
	groups: z.array(resourceV2GroupDefinitionSchema),
});
