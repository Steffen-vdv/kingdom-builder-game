import { describe, expect, it } from 'vitest';
import type {
	ActionMetaCategoryConfig,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import { deserializeSessionRegistries } from '../../src/state/sessionRegistries';

const createPayload = (
	metaCategories: Record<string, ActionMetaCategoryConfig>,
): SessionRegistriesPayload => ({
	actions: {},
	buildings: {},
	developments: {},
	actionMetaCategories: metaCategories,
	resources: {},
	resourceGroups: {},
	resourceCategories: {},
});

describe('deserializeSessionRegistries', () => {
	it('preserves pool config on action meta-categories', () => {
		const metaCategory: ActionMetaCategoryConfig = {
			id: 'meta:research',
			label: 'Research',
			icon: '🧬',
			bindingResourceId: 'resource:core:research',
			costModel: 'per-item',
			visibilityTrigger: 'resource-touched',
			order: 1,
			pool: {
				size: 3,
				fillMode: {
					type: 'tier-progression-curve',
					thresholds: [
						{ bindingSpent: 0, weights: { '1': 100, '2': 5, '3': 1 } },
						{ bindingSpent: 40, weights: { '1': 40, '2': 45, '3': 15 } },
					],
				},
			},
		};

		const payload = createPayload({ 'meta:research': metaCategory });
		const registries = deserializeSessionRegistries(payload);
		const deserialized = registries.actionMetaCategories.get('meta:research');

		expect(deserialized.pool).toBeDefined();
		expect(deserialized.pool?.size).toBe(3);
		expect(deserialized.pool?.fillMode.type).toBe('tier-progression-curve');
		expect(deserialized.pool?.fillMode.thresholds).toHaveLength(2);
		expect(deserialized.pool?.fillMode.thresholds[0]?.bindingSpent).toBe(0);
		expect(deserialized.pool?.fillMode.thresholds[0]?.weights).toEqual({
			'1': 100,
			'2': 5,
			'3': 1,
		});
	});

	it('returns a deep clone so payload mutations do not leak', () => {
		const metaCategory: ActionMetaCategoryConfig = {
			id: 'meta:research',
			label: 'Research',
			icon: '🧬',
			bindingResourceId: 'resource:core:research',
			costModel: 'per-item',
			visibilityTrigger: 'resource-touched',
			order: 1,
			pool: {
				size: 3,
				fillMode: {
					type: 'tier-progression-curve',
					thresholds: [{ bindingSpent: 0, weights: { '1': 100 } }],
				},
			},
		};
		const payload = createPayload({ 'meta:research': metaCategory });

		const registries = deserializeSessionRegistries(payload);
		metaCategory.pool!.size = 99;

		const deserialized = registries.actionMetaCategories.get('meta:research');
		expect(deserialized.pool?.size).toBe(3);
	});
});
