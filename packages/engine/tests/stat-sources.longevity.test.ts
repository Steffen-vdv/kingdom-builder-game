import { describe, it, expect } from 'vitest';
import { runEffects } from '../src/index.ts';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';

describe('stat sources longevity', () => {
	it('captures ongoing and permanent stat sources with dependencies', () => {
		const engineContext = createTestEngine();
		const player = engineContext.activePlayer;

		// Stat values ARE ResourceV2 IDs directly - no mapper needed
		const growthId = Stat.growth;
		const armyStrengthId = Stat.armyStrength;
		const growthSources = Object.values(player.statSources[growthId] ?? {});
		expect(growthSources.length).toBeGreaterThan(0);
		const growthTotal = growthSources.reduce(
			(sum, entry) => sum + entry.amount,
			0,
		);
		expect(growthTotal).toBeCloseTo(player.resourceValues[Stat.growth]);
		expect(
			growthSources.some((entry) => entry.meta.longevity === 'permanent'),
		).toBe(true);

		runEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: PopulationRole.Legion },
				},
			],
			engineContext,
		);

		const getPopulationEntries = () =>
			Object.values(player.statSources[armyStrengthId] ?? {}).filter(
				(entry) => entry.meta.kind === 'population',
			);
		const [passiveEntry] = getPopulationEntries();
		expect(passiveEntry?.amount).toBe(1);
		expect(passiveEntry?.meta.longevity).toBe('ongoing');
		expect(passiveEntry?.meta.kind).toBe('population');
		expect(passiveEntry?.meta.detail).toBe('Passive');
		expect(passiveEntry?.meta.dependsOn).toEqual(
			expect.arrayContaining([
				{
					type: 'population',
					id: PopulationRole.Legion,
					detail: 'assigned',
				},
			]),
		);
		expect(passiveEntry?.meta.removal).toMatchObject({
			type: 'population',
			id: PopulationRole.Legion,
			detail: 'unassigned',
		});

		runEffects(
			[
				{
					type: 'population',
					method: 'remove',
					params: { role: PopulationRole.Legion },
				},
			],
			engineContext,
		);

		expect(getPopulationEntries()).toHaveLength(0);
	});
});
