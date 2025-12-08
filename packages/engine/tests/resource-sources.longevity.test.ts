import { describe, it, expect } from 'vitest';
import { Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';

describe('resource sources longevity', () => {
	it('captures permanent resource sources from starting configuration', () => {
		const engineContext = createTestEngine();
		const player = engineContext.activePlayer;

		// Stat values ARE Resource IDs directly - no mapper needed
		const growthId = Stat.growth;
		const growthSources = Object.values(player.resourceSources[growthId] ?? {});
		expect(growthSources.length).toBeGreaterThan(0);
		const growthTotal = growthSources.reduce(
			(sum, entry) => sum + entry.amount,
			0,
		);
		expect(growthTotal).toBeCloseTo(player.resourceValues[Stat.growth]);
		expect(
			growthSources.some((entry) => entry.meta.longevity === 'permanent'),
		).toBe(true);
	});
});
