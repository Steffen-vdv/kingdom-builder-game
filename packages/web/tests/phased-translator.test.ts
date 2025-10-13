import { describe, expect, it, vi } from 'vitest';
import type { PhasedDef } from '../src/translation/content/phased';
import type { SummaryEntry } from '../src/translation/content/types';
import type {
	TranslationAssets,
	TranslationContext,
	TranslationPhase,
} from '../src/translation/context/types';

function createStubContext(
	overrides: Partial<Pick<TranslationContext, 'assets' | 'phases'>>,
): TranslationContext {
	const assets: TranslationAssets = Object.freeze({
		resources: Object.freeze({}),
		stats: Object.freeze({}),
		populations: Object.freeze({}),
		population: Object.freeze({}),
		land: Object.freeze({}),
		slot: Object.freeze({}),
		passive: Object.freeze({}),
		upkeep: Object.freeze({}),
		modifiers: Object.freeze({}),
		triggers: Object.freeze({}),
		tierSummaries: Object.freeze({}),
		formatPassiveRemoval: (description: string) => description,
		...(overrides.assets ?? {}),
	});
	const phases: readonly TranslationPhase[] = Object.freeze(
		overrides.phases ? [...overrides.phases] : [],
	);
	return {
		assets,
		phases,
	} as unknown as TranslationContext;
}

vi.mock('../src/translation/content/building', () => ({ __esModule: true }));
vi.mock('../src/translation/content/development', () => ({ __esModule: true }));

async function loadTranslator() {
	const module = await import('../src/translation/content/phased');
	return module.PhasedTranslator;
}

describe('PhasedTranslator', () => {
	it('uses translation assets when formatting trigger headers', async () => {
		const Translator = await loadTranslator();
		const translator = new Translator();
		const beforeAttackedEffects: PhasedDef['onBeforeAttacked'] = [{} as never];
		const phasedDefinition: PhasedDef = {
			onBeforeAttacked: beforeAttackedEffects,
		};
		const expectedSummary: SummaryEntry[] = ['Prevent damage'];
		const effectMapper = (effects: PhasedDef[keyof PhasedDef]) =>
			effects === beforeAttackedEffects ? expectedSummary : [];
		const context = createStubContext({
			assets: Object.freeze({
				triggers: Object.freeze({
					onBeforeAttacked: Object.freeze({
						icon: '🛡️',
						future: 'Brace for impact',
					}),
				}),
			}),
			phases: Object.freeze([]),
		});
		const summary = (
			translator as unknown as {
				translate(
					definition: PhasedDef,
					context: TranslationContext,
					mapper: (
						effects: PhasedDef[keyof PhasedDef],
						ctx: TranslationContext,
					) => SummaryEntry[],
				): SummaryEntry[];
			}
		).translate(phasedDefinition, context, effectMapper);
		expect(summary).toEqual([
			{
				title: '🛡️ Brace for impact',
				items: expectedSummary,
			},
		]);
	});

	it('derives step trigger titles from phase metadata when assets are missing', async () => {
		const Translator = await loadTranslator();
		const translator = new Translator();
		const stepEffects: PhasedDef[string] = [{} as never];
		const phasedDefinition: PhasedDef = {
			'phase:synthetic:step': stepEffects,
		};
		const stepSummary: SummaryEntry[] = ['Trigger'];
		const effectMapper = (effects: PhasedDef[keyof PhasedDef]) =>
			effects === stepEffects ? stepSummary : [];
		const context = createStubContext({
			phases: Object.freeze([
				Object.freeze({
					id: 'phase:synthetic',
					icon: '🧪',
					label: 'Synthetic',
					steps: Object.freeze([
						Object.freeze({
							id: 'phase:synthetic:step',
							title: 'Experiments',
							triggers: Object.freeze(['phase:synthetic:step']),
						}),
					]),
				}),
			]),
		});
		const summary = (
			translator as unknown as {
				translate(
					definition: PhasedDef,
					context: TranslationContext,
					mapper: (
						effects: PhasedDef[keyof PhasedDef],
						ctx: TranslationContext,
					) => SummaryEntry[],
				): SummaryEntry[];
			}
		).translate(phasedDefinition, context, effectMapper);
		expect(summary).toEqual([
			{
				title: 'During 🧪 Synthetic Phase — Experiments step',
				items: stepSummary,
			},
		]);
	});
});
