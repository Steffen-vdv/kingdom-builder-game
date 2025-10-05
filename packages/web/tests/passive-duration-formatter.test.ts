import { describe, it, expect, vi } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import {
	createEngine,
	type EffectDef,
	type PlayerId,
} from '@kingdom-builder/engine';
import { createContentFactory } from '../../engine/tests/factories/content';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/protocol';
import type { RuleSet } from '@kingdom-builder/engine/services';
import { PhaseId } from '@kingdom-builder/contents';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const PASSIVE_REGISTRY = wrapTranslationRegistry<unknown>({
	get(id: string) {
		return { id };
	},
	has() {
		return true;
	},
});

const ACTIVE_PLAYER = toTranslationPlayer({
	id: 'A' as PlayerId,
	name: 'Player A',
	resources: {},
	population: {},
	stats: {},
});

const OPPONENT_PLAYER = toTranslationPlayer({
	id: 'B' as PlayerId,
	name: 'Player B',
	resources: {},
	population: {},
	stats: {},
});

function createStubFormatterContext(
	phases: Parameters<typeof createTranslationContextStub>[0]['phases'],
) {
	return createTranslationContextStub({
		phases,
		actionCostResource: undefined,
		actions: PASSIVE_REGISTRY,
		buildings: PASSIVE_REGISTRY,
		developments: PASSIVE_REGISTRY,
		activePlayer: ACTIVE_PLAYER,
		opponent: OPPONENT_PLAYER,
	});
}

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

	it('fills missing context metadata from static phase definitions', () => {
		const ctx = createStubFormatterContext([
			{ id: PhaseId.Growth },
			{ id: PhaseId.Upkeep },
		]);
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:static-growth',
				durationPhaseId: PhaseId.Growth,
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], ctx);

		expect(summary).toEqual([{ title: '⏳ Until next 🏗️ Growth', items: [] }]);
	});

	it('prefers contextual metadata over static phase definitions', () => {
		const ctx = createStubFormatterContext([
			{
				id: PhaseId.Growth,
				label: 'Rapid Growth',
				icon: '🌱',
			},
		]);
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:context-growth',
				durationPhaseId: PhaseId.Growth,
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], ctx);

		expect(summary).toEqual([
			{ title: '⏳ Until next 🌱 Rapid Growth', items: [] },
		]);
	});

	it('resolves phase metadata via trigger keys when duration id is missing', () => {
		const ctx = createStubFormatterContext([
			{
				id: PhaseId.Upkeep,
				label: 'Rest & Recover',
				icon: '🛏️',
				steps: [
					{
						id: 'custom:upkeep',
						triggers: ['onUpkeepPhase'],
					},
				],
			},
		]);
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:trigger-upkeep',
				onUpkeepPhase: [],
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], ctx);

		expect(summary).toEqual([
			{ title: '⏳ Until next 🛏️ Rest & Recover', items: [] },
		]);
	});
});
