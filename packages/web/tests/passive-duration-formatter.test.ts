import { describe, it, expect, vi } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import { createContentFactory } from '../../engine/tests/factories/content';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/engine/config/schema';
import type { RuleSet } from '@kingdom-builder/engine/services';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createSyntheticCtx() {
	const content = createContentFactory();
	const tierResourceKey = 'synthetic:resource:tier';
	const phases: PhaseDef[] = [
		{
			id: 'phase:festival',
			label: 'Festival',
			icon: '🎉',
			steps: [{ id: 'phase:festival:step' }],
		},
	];
	const start: StartConfig = {
		player: {
			resources: { [tierResourceKey]: 0 },
			stats: {},
			population: {},
			lands: [],
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: tierResourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
	};
	return createEngine({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		populations: content.populations,
		phases,
		start,
		rules,
	});
}

describe('passive formatter duration metadata', () => {
	it('uses custom phase metadata when provided', () => {
		const ctx = createSyntheticCtx();
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:festival',
				name: 'Festival Spirit',
				icon: '✨',
				durationPhaseId: 'phase:festival',
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], ctx);
		const description = describeEffects([passive], ctx);
		const log = logEffects([passive], ctx);

		expect(summary).toEqual([
			{ title: '⏳ Until next 🎉 Festival', items: [] },
		]);
		expect(description).toEqual([
			{
				title: '✨ Festival Spirit – Until your next 🎉 Festival',
				items: [],
			},
		]);
		expect(log).toEqual([
			{
				title: '✨ Festival Spirit added',
				items: ["✨ Festival Spirit duration: Until player's next 🎉 Festival"],
			},
		]);
	});
});
