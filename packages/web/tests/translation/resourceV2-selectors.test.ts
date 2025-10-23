import { describe, expect, it } from 'vitest';
import type {
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import { deserializeSessionRegistries } from '../../src/state/sessionRegistries';
import { createTranslationAssets } from '../../src/translation/context/assets';
import {
	resourceDisplaysAsPercent,
	selectGlobalActionCost,
	selectResourceBounds,
	selectResourceTierTrack,
} from '../../src/translation/context/assetSelectors';
import { statDisplaysAsPercent, formatStatValue } from '../../src/utils/stats';
import { createEmptySnapshotMetadata } from '../helpers/sessionFixtures';

describe('ResourceV2 metadata selectors', () => {
	it('derives percent flags, bounds, tier tracks, and global cost labels from registries', () => {
		const tierTrack: ResourceV2TierTrackDefinition = {
			id: 'tier-track.child',
			tiers: [
				{
					id: 'tier.child.one',
					range: { min: 0, max: 5 },
				} satisfies ResourceV2TierDefinition,
			],
		};
		const parentTierTrack: ResourceV2TierTrackDefinition = {
			id: 'tier-track.parent',
			tiers: [
				{
					id: 'tier.parent.one',
					range: { min: 0, max: 10 },
				} satisfies ResourceV2TierDefinition,
			],
		};
		const childDefinition = createResourceV2Definition({
			id: 'resource:test:child',
			name: 'Test Child',
			icon: 'icon-child',
			description: 'Child description',
			displayAsPercent: true,
			bounds: { lowerBound: 1, upperBound: 9 },
			tierTrack,
			globalActionCost: { amount: 3 },
		});
		const groupDefinition = createResourceV2Group({
			id: 'resource:test:group',
			children: [childDefinition.id],
			parentId: 'resource:test:parent',
			parentName: 'Parent Resource',
			parentIcon: 'icon-parent',
			parentDescription: 'Parent description',
			parentDisplayAsPercent: true,
			parentBounds: { lowerBound: 0, upperBound: 25 },
			parentTierTrack,
		});
		const registries = deserializeSessionRegistries({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourceDefinitions: [childDefinition],
			resourceGroups: [groupDefinition],
		});
		const metadata = createEmptySnapshotMetadata({
			resources: {
				[childDefinition.id]: { label: 'Legacy Child Label' },
				[groupDefinition.parent.id]: { label: 'Parent Label' },
			},
			stats: {},
			populations: {},
			assets: {
				passive: {},
				slot: {},
				land: {},
				population: {},
				transfer: {},
				upkeep: {},
			},
			triggers: {},
			buildings: {},
			developments: {},
		});
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: childDefinition.id,
			tierDefinitions: [],
			winConditions: [],
		};
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
			},
			metadata as SessionSnapshot['metadata'],
			{ rules: ruleSnapshot },
		);
		const parentId = groupDefinition.parent.id;
		expect(assets.resources[childDefinition.id]?.label).toBe(
			'Legacy Child Label',
		);
		expect(assets.resources[parentId]?.icon).toBe('icon-parent');
		expect(resourceDisplaysAsPercent(assets, childDefinition.id)).toBe(true);
		expect(statDisplaysAsPercent(childDefinition.id, assets)).toBe(false);
		expect(formatStatValue(childDefinition.id, 0.5, assets)).toBe('0.5');
		expect(selectResourceBounds(assets, childDefinition.id)).toEqual({
			lowerBound: 1,
			upperBound: 9,
		});
		expect(selectResourceTierTrack(assets, parentId)).toEqual(parentTierTrack);
		const globalCost = selectGlobalActionCost(assets);
		expect(globalCost).toEqual({
			resourceId: childDefinition.id,
			amount: 3,
			label: 'Test Child',
			icon: 'icon-child',
			description: 'Child description',
		});
	});
});
