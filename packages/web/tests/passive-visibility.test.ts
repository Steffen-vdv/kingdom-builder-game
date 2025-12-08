import { describe, expect, it } from 'vitest';
import {
	createPassiveVisibilityContext,
	derivePassiveOrigin,
	filterPassivesForSurface,
	shouldSurfacePassive,
	type PassiveLike,
	type PassiveOwner,
} from '../src/passives/visibility';

// Synthetic population IDs for testing visibility heuristics.
// Under ResourceV2, population roles are resources - these IDs represent
// resources with population semantics.
const populationIds = ['resource:population:role:legion'] as const;
const visibilityOptions = { populationIds } as const;

function createOwner(overrides: Partial<PassiveOwner> = {}): PassiveOwner {
	return {
		buildings: new Set<string>(),
		lands: [],
		...overrides,
	};
}

describe('passive visibility helpers', () => {
	it('derives origins from metadata when available', () => {
		const owner = createOwner();
		const passive: PassiveLike = {
			id: 'mystery-source',
			meta: { source: { type: 'building' } },
		};
		expect(derivePassiveOrigin(passive, owner, visibilityOptions)).toBe(
			'building',
		);
	});

	it('falls back to heuristics for building, development, and population passives', () => {
		const owner = createOwner({
			buildings: new Set<string>(['castle']),
			lands: [
				{
					id: 'land-1',
					developments: ['watchtower'],
				},
			],
		});
		const context = createPassiveVisibilityContext(owner, visibilityOptions);
		expect(derivePassiveOrigin({ id: 'castle' }, context)).toBe('building');
		expect(derivePassiveOrigin({ id: 'castle_bonus' }, context)).toBe(
			'building-bonus',
		);
		expect(derivePassiveOrigin({ id: 'watchtower_land-1' }, context)).toBe(
			'development',
		);
		const populationEntry = populationIds[0];
		expect(populationEntry).toBeTruthy();
		if (!populationEntry) {
			throw new Error('Expected at least one population definition.');
		}
		const populationPassiveId = `${populationEntry}_assignment`;
		expect(derivePassiveOrigin({ id: populationPassiveId }, context)).toBe(
			'population-assignment',
		);
		expect(derivePassiveOrigin({ id: 'independent' }, context)).toBe(
			'standalone',
		);
	});

	it('hides building-derived passives for common surfaces', () => {
		const owner = createOwner({
			buildings: new Set<string>(['castle']),
			lands: [],
		});
		const context = createPassiveVisibilityContext(owner, visibilityOptions);
		const buildingPassive: PassiveLike = { id: 'castle' };
		expect(shouldSurfacePassive(buildingPassive, context, 'player-panel')).toBe(
			false,
		);
		expect(shouldSurfacePassive(buildingPassive, context, 'log')).toBe(false);
		const standalone: PassiveLike = { id: 'standalone' };
		expect(shouldSurfacePassive(standalone, context, 'player-panel')).toBe(
			true,
		);
	});

	it('filters out hidden passives when preparing surface collections', () => {
		const owner = createOwner({
			buildings: new Set<string>(['castle']),
			lands: [
				{
					id: 'land-1',
					developments: ['watchtower'],
				},
			],
		});
		const context = createPassiveVisibilityContext(owner, visibilityOptions);
		const populationEntry = populationIds[0];
		expect(populationEntry).toBeTruthy();
		if (!populationEntry) {
			throw new Error('Expected at least one population definition.');
		}
		const passives: PassiveLike[] = [
			{ id: 'castle' },
			{ id: 'castle_bonus' },
			{ id: 'watchtower_land-1' },
			{ id: `${populationEntry}_assignment` },
			{ id: 'independent' },
		];
		const visible = filterPassivesForSurface(passives, context, 'player-panel');
		expect(visible).toEqual([{ id: 'independent' }]);
	});
});
