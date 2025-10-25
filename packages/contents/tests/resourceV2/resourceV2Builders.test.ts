import { describe, expect, it } from 'vitest';

import { createResourceGroupRegistry, createResourceV2Registry, resourceV2, type ResourceV2TierTrack } from '../../src/resourceV2';
import { resourceV2Definition, resourceV2GroupDefinition } from '@kingdom-builder/testing';

describe('resourceV2 builder', () => {
	it('builds a fully configured resource definition', () => {
		const tierTrack: ResourceV2TierTrack = {
			metadata: {
				id: 'track:focus',
				label: 'Focus Track',
				icon: '🎯',
			},
			tiers: [
				{
					id: 'tier:steady',
					label: 'Steady',
					icon: '✨',
					threshold: { min: 0 },
					enterEffects: [],
					exitEffects: [],
				},
			],
		};

		const definition = resourceV2('resource:focus')
			.label('Focus')
			.icon('icon:focus')
			.description('Keep your citizens on task.')
			.order(3)
			.displayAsPercent()
			.lowerBound(0)
			.upperBound(10)
			.trackValueBreakdown()
			.trackBoundBreakdown()
			.group('group:efficiency', { order: 2 })
			.tags('core', ['productivity', 'core'])
			.tierTrack(tierTrack)
			.globalActionCost(5)
			.build();

		expect(definition).toEqual({
			id: 'resource:focus',
			label: 'Focus',
			icon: 'icon:focus',
			description: 'Keep your citizens on task.',
			order: 3,
			displayAsPercent: true,
			lowerBound: 0,
			upperBound: 10,
			trackValueBreakdown: true,
			trackBoundBreakdown: true,
			groupId: 'group:efficiency',
			groupOrder: 2,
			tags: ['core', 'productivity'],
			tierTrack,
			globalCost: { amount: 5 },
		});
	});

	it('rejects duplicate setter calls', () => {
		const withLabel = resourceV2('resource:duplicate-label').label('Primary').icon('icon:duplicate');
		expect(() => withLabel.label('Again')).toThrowError('ResourceV2 builder already has label() set. Remove the duplicate call.');

		const withLowerBound = resourceV2('resource:duplicate-lower').label('Lower').icon('icon:lower').lowerBound(0);
		expect(() => withLowerBound.lowerBound(1)).toThrowError('ResourceV2 builder already has lowerBound() set. Remove the duplicate call.');

		const withToggle = resourceV2('resource:duplicate-toggle').label('Toggle').icon('icon:toggle').displayAsPercent();
		expect(() => withToggle.displayAsPercent()).toThrowError('ResourceV2 builder already toggled displayAsPercent(). Remove the duplicate call.');
	});

	it('enforces valid bounds', () => {
		expect(() => resourceV2('resource:bounds').lowerBound(5).upperBound(4)).toThrowError('ResourceV2 builder lowerBound must be less than or equal to upperBound (5 > 4).');
	});

	it('requires positive integer global action cost amounts', () => {
		expect(() => resourceV2('resource:cost-int').globalActionCost(1.5)).toThrowError('ResourceV2 builder expected globalCost.amount to be an integer but received 1.5.');

		expect(() => resourceV2('resource:cost-zero').globalActionCost(0)).toThrowError('ResourceV2 builder expected globalCost.amount to be greater than 0 but received 0.');
	});
});

describe('resourceV2 group builders and registries', () => {
	it('preserves parent metadata and ordering through the group registry', () => {
		const economy = resourceV2GroupDefinition({
			id: 'group:economy',
			order: 2,
			parent: {
				id: 'resource:gold',
				label: 'Economy',
				icon: 'icon:gold',
				description: 'Financial resources and income.',
			},
		});
		const military = resourceV2GroupDefinition({
			id: 'group:military',
			order: 3,
		});

		expect(economy.parent).toEqual({
			id: 'resource:gold',
			label: 'Economy',
			icon: 'icon:gold',
			description: 'Financial resources and income.',
		});

		const registry = createResourceGroupRegistry([economy, military]);
		expect(registry.byId['group:economy']).toBe(economy);
		expect(registry.byId['group:military']).toBe(military);
		expect(registry.ordered).toEqual([economy, military]);
	});

	it('keeps resource ordering and group metadata inside the resource registry', () => {
		const wealth = resourceV2Definition({
			id: 'resource:wealth',
			metadata: {
				label: 'Wealth',
				icon: 'icon:wealth',
				order: 1,
				group: { id: 'group:economy', order: 2 },
			},
		});
		const defense = resourceV2Definition({
			id: 'resource:defense',
			metadata: {
				label: 'Defense',
				icon: 'icon:defense',
				order: 3,
				group: { id: 'group:military', order: 1 },
			},
		});

		const registry = createResourceV2Registry([wealth, defense]);
		expect(registry.byId['resource:wealth']).toBe(wealth);
		expect(registry.byId['resource:defense']).toBe(defense);
		expect(registry.ordered).toEqual([wealth, defense]);
		expect(wealth.groupId).toBe('group:economy');
		expect(wealth.groupOrder).toBe(2);
		expect(defense.groupId).toBe('group:military');
		expect(defense.groupOrder).toBe(1);
	});
});
