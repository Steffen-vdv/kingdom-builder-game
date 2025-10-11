import { describe, it, expect } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import { type EffectDef, type PlayerId } from '@kingdom-builder/engine';
import type { PhaseDef } from '@kingdom-builder/protocol';
import type { TranslationAssets } from '../src/translation/context';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';

const PASSIVE_REGISTRY = wrapTranslationRegistry<unknown>({
	get(id: string) {
		return { id };
	},
	has() {
		return true;
	},
});

const BASE_ASSETS: TranslationAssets = {
	resources: {},
	stats: {},
	populations: {},
	population: {},
	land: {},
	slot: {},
	passive: {},
	modifiers: {},
	resourceTransferIcon: undefined,
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

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
	assets?: Parameters<typeof createTranslationContextStub>[0]['assets'],
) {
	return createTranslationContextStub({
		phases,
		actionCostResource: undefined,
		actions: PASSIVE_REGISTRY,
		buildings: PASSIVE_REGISTRY,
		developments: PASSIVE_REGISTRY,
		activePlayer: ACTIVE_PLAYER,
		opponent: OPPONENT_PLAYER,
		assets,
	});
}

describe('passive formatter duration metadata', () => {
	it('uses custom phase metadata when provided', () => {
		const phases: PhaseDef[] = [
			{
				id: 'phase:festival',
				label: 'Festival',
				icon: '🎉',
				steps: [{ id: 'phase:festival:step' }],
			},
		];
		const ctx = createStubFormatterContext(phases);
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

	it('fills missing phase metadata from translation assets when context lacks labels', () => {
		const phases: PhaseDef[] = [{ id: 'phase:growth' }, { id: 'phase:upkeep' }];
		const ctx = createStubFormatterContext(phases, {
			...BASE_ASSETS,
			phases: {
				'phase:growth': { icon: '🏗️', label: 'Growth' },
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:static-growth',
				durationPhaseId: 'phase:growth',
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], ctx);

		expect(summary).toEqual([{ title: '⏳ Until next 🏗️ Growth', items: [] }]);
	});

	it('prefers contextual metadata over static phase definitions', () => {
		const ctx = createStubFormatterContext([
			{
				id: 'phase:growth',
				label: 'Rapid Growth',
				icon: '🌱',
			},
		]);
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:context-growth',
				durationPhaseId: 'phase:growth',
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
				id: 'phase:upkeep',
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
