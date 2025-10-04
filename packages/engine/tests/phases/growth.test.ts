import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createPhaseTestEnvironment } from './fixtures.ts';

describe('Growth phase', () => {
	it('triggers population and development effects', () => {
		const { ctx, ids, roles, resources, values } = createPhaseTestEnvironment();
		const player = ctx.activePlayer;
		const apBefore = player.resources[resources.ap];
		const goldBefore = player.resources[resources.gold];
		while (ctx.game.currentPhase === ids.phases.growth) {
			advance(ctx);
		}
		const councils = player.population[roles.council];
		expect(player.resources[resources.ap]).toBe(
			apBefore + values.councilApGain * councils,
		);
		expect(player.resources[resources.gold]).toBe(
			goldBefore + values.farmIncome,
		);
	});

	it('applies player B compensation at start and not during growth', () => {
		const { ctx, phases, ids, roles, resources, values } =
			createPhaseTestEnvironment();
		const baseAp = values.baseAp;
		const comp = values.apCompensation;
		const playerA = ctx.game.players[0]!;
		const playerB = ctx.game.players[1]!;
		expect(playerA.resources[resources.ap]).toBe(baseAp);
		expect(playerB.resources[resources.ap]).toBe(baseAp + comp);

		const growthPhaseIndex = phases.findIndex(
			(phase) => phase.id === ids.phases.growth,
		);
		const gainApIdx = phases[growthPhaseIndex]!.steps.findIndex(
			(step) => step.id === ids.steps.gainAp,
		);

		ctx.game.currentPlayerIndex = 0;
		ctx.game.phaseIndex = growthPhaseIndex;
		ctx.game.stepIndex = gainApIdx;
		ctx.game.currentPhase = ids.phases.growth;
		ctx.game.currentStep = ids.steps.gainAp;
		playerA.resources[resources.ap] = 0;
		advance(ctx);
		const councilsA = playerA.population[roles.council];
		expect(playerA.resources[resources.ap]).toBe(
			values.councilApGain * councilsA,
		);

		ctx.game.currentPlayerIndex = 1;
		ctx.game.phaseIndex = growthPhaseIndex;
		ctx.game.stepIndex = gainApIdx;
		ctx.game.currentPhase = ids.phases.growth;
		ctx.game.currentStep = ids.steps.gainAp;
		playerB.resources[resources.ap] = 0;
		advance(ctx);
		const councilsB = playerB.population[roles.council];
		expect(playerB.resources[resources.ap]).toBe(
			values.councilApGain * councilsB,
		);

		for (let i = 0; i < 3; i++) {
			ctx.game.currentPlayerIndex = 1;
			ctx.game.phaseIndex = growthPhaseIndex;
			ctx.game.stepIndex = gainApIdx;
			ctx.game.currentPhase = ids.phases.growth;
			ctx.game.currentStep = ids.steps.gainAp;
			playerB.resources[resources.ap] = 0;
			advance(ctx);
			expect(playerB.resources[resources.ap]).toBe(
				values.councilApGain * councilsB,
			);
		}
	});

	it('grows legion and fortifier stats', () => {
		const { ctx, ids, roles, stats } = createPhaseTestEnvironment();
		const player = ctx.activePlayer;
		player.population[roles.legion] = 1;
		player.population[roles.fortifier] = 1;
		player.stats[stats.army] = 8;
		player.stats[stats.fort] = 4;
		const growth = player.stats[stats.growth];
		while (ctx.game.currentPhase === ids.phases.growth) {
			advance(ctx);
		}
		const expectedArmy = Math.ceil(8 + 8 * growth);
		const expectedFort = Math.ceil(4 + 4 * growth);
		expect(player.stats[stats.army]).toBe(expectedArmy);
		expect(player.stats[stats.fort]).toBe(expectedFort);
		expect(Number.isInteger(player.stats[stats.army])).toBe(true);
		expect(Number.isInteger(player.stats[stats.fort])).toBe(true);
		expect(player.stats[stats.army]).toBeGreaterThanOrEqual(0);
		expect(player.stats[stats.fort]).toBeGreaterThanOrEqual(0);
	});

	it('scales strength additively with multiple leaders', () => {
		const { ctx, ids, roles, stats } = createPhaseTestEnvironment();
		const player = ctx.activePlayer;
		player.population[roles.legion] = 2;
		player.population[roles.fortifier] = 2;
		player.stats[stats.army] = 10;
		player.stats[stats.fort] = 10;
		const growth = player.stats[stats.growth];
		while (ctx.game.currentPhase === ids.phases.growth) {
			advance(ctx);
		}
		const expectedArmy = Math.ceil(10 + 10 * growth * 2);
		const expectedFort = Math.ceil(10 + 10 * growth * 2);
		expect(player.stats[stats.army]).toBe(expectedArmy);
		expect(player.stats[stats.fort]).toBe(expectedFort);
		expect(Number.isInteger(player.stats[stats.army])).toBe(true);
		expect(Number.isInteger(player.stats[stats.fort])).toBe(true);
		expect(player.stats[stats.army]).toBeGreaterThanOrEqual(0);
		expect(player.stats[stats.fort]).toBeGreaterThanOrEqual(0);
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
			const { ctx, ids, roles, stats, values } = createPhaseTestEnvironment();
			const player = ctx.activePlayer;
			player.population[roles.legion] = legions;
			player.population[roles.fortifier] = fortifiers;
			player.stats[stats.army] = baseArmy;
			player.stats[stats.fort] = baseFort;
			const baseGrowth = values.baseGrowth;
			while (ctx.game.currentPhase === ids.phases.growth) {
				advance(ctx);
			}
			const expectedArmy = Math.ceil(
				baseArmy + baseArmy * baseGrowth * legions,
			);
			const expectedFort = Math.ceil(
				baseFort + baseFort * baseGrowth * fortifiers,
			);
			expect(player.stats[stats.army]).toBe(expectedArmy);
			expect(player.stats[stats.fort]).toBe(expectedFort);
			expect(Number.isInteger(player.stats[stats.army])).toBe(true);
			expect(Number.isInteger(player.stats[stats.fort])).toBe(true);
			expect(player.stats[stats.army]).toBeGreaterThanOrEqual(0);
			expect(player.stats[stats.fort]).toBeGreaterThanOrEqual(0);
		});

		it('never drops below zero', () => {
			const { ctx, ids, roles, stats } = createPhaseTestEnvironment();
			const player = ctx.activePlayer;
			player.population[roles.legion] = 1;
			player.population[roles.fortifier] = 1;
			player.stats[stats.army] = -5;
			player.stats[stats.fort] = -5;
			while (ctx.game.currentPhase === ids.phases.growth) {
				advance(ctx);
			}
			expect(player.stats[stats.army]).toBe(0);
			expect(player.stats[stats.fort]).toBe(0);
			expect(Number.isInteger(player.stats[stats.army])).toBe(true);
			expect(Number.isInteger(player.stats[stats.fort])).toBe(true);
		});
	});
});
