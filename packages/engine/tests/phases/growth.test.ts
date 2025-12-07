import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createPhaseTestEnvironment } from './fixtures.ts';

describe('Growth phase', () => {
	it('triggers population and development effects', () => {
		const { engineContext, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const player = engineContext.activePlayer;
		// resources.ap IS the Resource ID directly
		const apBefore = player.resourceValues[resources.ap] ?? 0;
		const goldBefore = player.resourceValues[resources.gold] ?? 0;
		while (engineContext.game.currentPhase === ids.phases.growth) {
			advance(engineContext);
		}
		// roles.council IS the Resource ID directly
		const councils = player.resourceValues[roles.council] ?? 0;
		expect(player.resourceValues[resources.ap]).toBe(
			apBefore + values.councilApGain * councils,
		);
		expect(player.resourceValues[resources.gold]).toBe(
			goldBefore + values.farmIncome,
		);
	});

	it('applies player B compensation at start and not during growth', () => {
		const { engineContext, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const baseAp = values.baseAp;
		const comp = values.apCompensation;
		const playerA = engineContext.game.players[0]!;
		const playerB = engineContext.game.players[1]!;
		expect(playerA.resourceValues[resources.ap]).toBe(baseAp);
		expect(playerB.resourceValues[resources.ap]).toBe(baseAp + comp);

		const growthPhaseIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.growth,
		);
		const gainApIdx = phases[growthPhaseIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.gainAp,
		);

		engineContext.game.currentPlayerIndex = 0;
		engineContext.game.phaseIndex = growthPhaseIndex;
		engineContext.game.stepIndex = gainApIdx;
		engineContext.game.currentPhase = ids.phases.growth;
		engineContext.game.currentStep = ids.steps.gainAp;
		playerA.resourceValues[resources.ap] = 0;
		advance(engineContext);
		const councilsA = playerA.resourceValues[roles.council] ?? 0;
		expect(playerA.resourceValues[resources.ap]).toBe(
			values.councilApGain * councilsA,
		);

		engineContext.game.currentPlayerIndex = 1;
		engineContext.game.phaseIndex = growthPhaseIndex;
		engineContext.game.stepIndex = gainApIdx;
		engineContext.game.currentPhase = ids.phases.growth;
		engineContext.game.currentStep = ids.steps.gainAp;
		playerB.resourceValues[resources.ap] = 0;
		advance(engineContext);
		const councilsB = playerB.resourceValues[roles.council] ?? 0;
		expect(playerB.resourceValues[resources.ap]).toBe(
			values.councilApGain * councilsB,
		);

		for (let iterationIndex = 0; iterationIndex < 3; iterationIndex++) {
			engineContext.game.currentPlayerIndex = 1;
			engineContext.game.phaseIndex = growthPhaseIndex;
			engineContext.game.stepIndex = gainApIdx;
			engineContext.game.currentPhase = ids.phases.growth;
			engineContext.game.currentStep = ids.steps.gainAp;
			playerB.resourceValues[resources.ap] = 0;
			advance(engineContext);
			expect(playerB.resourceValues[resources.ap]).toBe(
				values.councilApGain * councilsB,
			);
		}
	});

	it('grows legion and fortifier stats', () => {
		const { engineContext, ids, roles, stats } = createPhaseTestEnvironment();
		const player = engineContext.activePlayer;
		// roles and stats ARE Resource IDs directly
		player.resourceValues[roles.legion] = 1;
		player.resourceValues[roles.fortifier] = 1;
		player.resourceValues[stats.army] = 8;
		player.resourceValues[stats.fort] = 4;
		const growth = player.resourceValues[stats.growth] ?? 0;
		while (engineContext.game.currentPhase === ids.phases.growth) {
			advance(engineContext);
		}
		const expectedArmy = Math.ceil(8 + 8 * growth);
		const expectedFort = Math.ceil(4 + 4 * growth);
		expect(player.resourceValues[stats.army]).toBe(expectedArmy);
		expect(player.resourceValues[stats.fort]).toBe(expectedFort);
		expect(Number.isInteger(player.resourceValues[stats.army])).toBe(true);
		expect(Number.isInteger(player.resourceValues[stats.fort])).toBe(true);
		expect(player.resourceValues[stats.army]).toBeGreaterThanOrEqual(0);
		expect(player.resourceValues[stats.fort]).toBeGreaterThanOrEqual(0);
	});

	it('scales strength additively with multiple leaders', () => {
		const { engineContext, ids, roles, stats } = createPhaseTestEnvironment();
		const player = engineContext.activePlayer;
		player.resourceValues[roles.legion] = 2;
		player.resourceValues[roles.fortifier] = 2;
		player.resourceValues[stats.army] = 10;
		player.resourceValues[stats.fort] = 10;
		const growth = player.resourceValues[stats.growth] ?? 0;
		while (engineContext.game.currentPhase === ids.phases.growth) {
			advance(engineContext);
		}
		const expectedArmy = Math.ceil(10 + 10 * growth * 2);
		const expectedFort = Math.ceil(10 + 10 * growth * 2);
		expect(player.resourceValues[stats.army]).toBe(expectedArmy);
		expect(player.resourceValues[stats.fort]).toBe(expectedFort);
		expect(Number.isInteger(player.resourceValues[stats.army])).toBe(true);
		expect(Number.isInteger(player.resourceValues[stats.fort])).toBe(true);
		expect(player.resourceValues[stats.army]).toBeGreaterThanOrEqual(0);
		expect(player.resourceValues[stats.fort]).toBeGreaterThanOrEqual(0);
	});

	describe('strength growth scenarios', () => {
		const baseArmy = 5;
		const baseFort = 5;

		it.each([
			{
				label: '0 fortifiers',
				legions: 0,
				fortifiers: 0,
			},
			{
				label: '3 fortifiers',
				legions: 0,
				fortifiers: 3,
			},
			{
				label: '15 fortifiers',
				legions: 0,
				fortifiers: 15,
			},
			{
				label: '5 fortifiers and 5 legions',
				legions: 5,
				fortifiers: 5,
			},
		])('$label', ({ legions, fortifiers }) => {
			const { engineContext, ids, roles, stats, values } =
				createPhaseTestEnvironment();
			const player = engineContext.activePlayer;
			player.resourceValues[roles.legion] = legions;
			player.resourceValues[roles.fortifier] = fortifiers;
			player.resourceValues[stats.army] = baseArmy;
			player.resourceValues[stats.fort] = baseFort;
			const baseGrowth = values.baseGrowth;
			while (engineContext.game.currentPhase === ids.phases.growth) {
				advance(engineContext);
			}
			const expectedArmy = Math.ceil(
				baseArmy + baseArmy * baseGrowth * legions,
			);
			const expectedFort = Math.ceil(
				baseFort + baseFort * baseGrowth * fortifiers,
			);
			expect(player.resourceValues[stats.army]).toBe(expectedArmy);
			expect(player.resourceValues[stats.fort]).toBe(expectedFort);
			expect(Number.isInteger(player.resourceValues[stats.army])).toBe(true);
			expect(Number.isInteger(player.resourceValues[stats.fort])).toBe(true);
			expect(player.resourceValues[stats.army]).toBeGreaterThanOrEqual(0);
			expect(player.resourceValues[stats.fort]).toBeGreaterThanOrEqual(0);
		});

		it('never drops below zero', () => {
			const { engineContext, ids, roles, stats } = createPhaseTestEnvironment();
			const player = engineContext.activePlayer;
			player.resourceValues[roles.legion] = 1;
			player.resourceValues[roles.fortifier] = 1;
			player.resourceValues[stats.army] = -5;
			player.resourceValues[stats.fort] = -5;
			while (engineContext.game.currentPhase === ids.phases.growth) {
				advance(engineContext);
			}
			expect(player.resourceValues[stats.army]).toBe(0);
			expect(player.resourceValues[stats.fort]).toBe(0);
			expect(Number.isInteger(player.resourceValues[stats.army])).toBe(true);
			expect(Number.isInteger(player.resourceValues[stats.fort])).toBe(true);
		});
	});
});
