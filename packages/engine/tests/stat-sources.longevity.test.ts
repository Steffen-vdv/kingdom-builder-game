import { describe, it, expect } from 'vitest';
import { advance, runEffects } from '../src/index.ts';
import { PopulationRole, Stat, PhaseStepId } from '@kingdom-builder/contents';
import type { PhaseStepIdValue } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';

function findPhaseStep(
	engineContext: ReturnType<typeof createTestEngine>,
	stepId: PhaseStepIdValue,
) {
	return engineContext.phases.find((phase) =>
		phase.steps.some((step) => step.id === stepId),
	);
}

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
		expect(passiveEntry?.meta.dependsOn).toContainEqual({
			type: 'population',
			id: PopulationRole.Legion,
			detail: 'assigned',
		});
		expect(passiveEntry?.meta.removal).toMatchObject({
			type: 'population',
			id: PopulationRole.Legion,
			detail: 'unassigned',
		});

		const raiseStrengthPhase = findPhaseStep(
			engineContext,
			PhaseStepId.RaiseStrength,
		);
		expect(raiseStrengthPhase).toBeDefined();
		let result;
		do {
			result = advance(engineContext);
		} while (
			result.phase !== raiseStrengthPhase!.id ||
			result.step !== PhaseStepId.RaiseStrength
		);

		const phaseEntry = Object.values(
			player.statSources[armyStrengthId] ?? {},
		).find((entry) => entry.meta.kind === 'phase');
		expect(phaseEntry?.amount).toBe(1);
		expect(phaseEntry?.meta.detail).toBe(PhaseStepId.RaiseStrength);
		expect(phaseEntry?.meta.longevity).toBe('permanent');
		expect(phaseEntry?.meta.dependsOn).toEqual(
			expect.arrayContaining([
				{ type: 'population', id: PopulationRole.Legion },
				{ type: 'stat', id: growthId },
			]),
		);

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
		expect(phaseEntry?.amount).toBe(1);
	});
});
