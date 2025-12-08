import { describe, expect, it } from 'vitest';

import { createResourceGroupRegistry, createResourceRegistry, resource, type ResourceTierTrack } from '../../src/resource';
import { resourceDefinition, resourceGroupDefinition } from '@kingdom-builder/testing';
import { RESOURCE_GROUP_REGISTRY } from '../../src/registries/resource';

describe('resource builder', () => {
	it('builds a fully configured resource definition', () => {
		const tierTrack: ResourceTierTrack = {
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

		const definition = resource('resource:focus')
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
		const withLabel = resource('resource:duplicate-label').label('Primary').icon('icon:duplicate');
		expect(() => withLabel.label('Again')).toThrowError('Resource builder already has label() set. Remove the duplicate call.');

		const withLowerBound = resource('resource:duplicate-lower').label('Lower').icon('icon:lower').lowerBound(0);
		expect(() => withLowerBound.lowerBound(1)).toThrowError('Resource builder already has lowerBound() set. Remove the duplicate call.');

		const withToggle = resource('resource:duplicate-toggle').label('Toggle').icon('icon:toggle').displayAsPercent();
		expect(() => withToggle.displayAsPercent()).toThrowError('Resource builder already toggled displayAsPercent(). Remove the duplicate call.');
	});

	it('enforces valid bounds', () => {
		expect(() => resource('resource:bounds').lowerBound(5).upperBound(4)).toThrowError('Resource builder lowerBound must be less than or equal to upperBound (5 > 4).');
	});

	it('requires positive integer global action cost amounts', () => {
		expect(() => resource('resource:cost-int').globalActionCost(1.5)).toThrowError('Resource builder expected globalCost.amount to be an integer but received 1.5.');

		expect(() => resource('resource:cost-zero').globalActionCost(0)).toThrowError('Resource builder expected globalCost.amount to be greater than 0 but received 0.');
	});
});

describe('resource group builders and registries', () => {
	it('preserves parent metadata and ordering through the group registry', () => {
		const economy = resourceGroupDefinition({
			id: 'group:economy',
			order: 2,
			parent: {
				id: 'resource:gold',
				label: 'Economy',
				icon: 'icon:gold',
				description: 'Financial resources and income.',
			},
		});
		const military = resourceGroupDefinition({
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
		const wealth = resourceDefinition({
			id: 'resource:wealth',
			metadata: {
				label: 'Wealth',
				icon: 'icon:wealth',
				order: 1,
				group: { id: 'group:economy', order: 2 },
			},
		});
		const defense = resourceDefinition({
			id: 'resource:defense',
			metadata: {
				label: 'Defense',
				icon: 'icon:defense',
				order: 3,
				group: { id: 'group:military', order: 1 },
			},
		});

		const registry = createResourceRegistry([wealth, defense]);
		expect(registry.byId['resource:wealth']).toBe(wealth);
		expect(registry.byId['resource:defense']).toBe(defense);
		expect(registry.ordered).toEqual([wealth, defense]);
		expect(wealth.groupId).toBe('group:economy');
		expect(wealth.groupOrder).toBe(2);
		expect(defense.groupId).toBe('group:military');
		expect(defense.groupOrder).toBe(1);
	});
});

describe('production resource group definitions', () => {
	it('requires all groups to have explicit label and icon (no fallback)', () => {
		// Groups MUST have their own label and icon - we do NOT fall back to
		// parent metadata because that hides misconfiguration
		for (const group of RESOURCE_GROUP_REGISTRY.ordered) {
			expect(group.label, `Group "${group.id}" is missing label`).toBeTruthy();
			expect(group.icon, `Group "${group.id}" is missing icon`).toBeTruthy();
		}
	});
});
